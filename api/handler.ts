// Single Vercel Function for the whole api/ surface (api/handler.ts),
// reached through vercel.json's `rewrites` rather than file-system
// dynamic segments.
//
// Why this exists (see MEMORY.md for the full incident writeup): two
// earlier attempts at collapsing api/*.ts under the Hobby plan's
// 12-function cap both relied on Vercel's file-system dynamic-segment
// conventions ([[...id]].ts, then [...route].ts) and both broke silently
// in production -- builds were green, but real requests 404'd depending
// on how many path segments they had (bare /api/products vs.
// /api/products/:id behaved inconsistently across both attempts, and not
// the same way each time). This project's build ("framework": "vite" in
// vercel.json, not Next.js) does not reliably support multi-segment
// dynamic file routing at all, in either direction.
//
// The fix: don't route through the filesystem. `vercel.json` rewrites
// every /api/:resource and /api/:resource/:id request to this one literal
// file (`/api/handler`, no dynamic segment in its own path -- the most
// basic, unambiguous case, exactly how the original index.ts files
// already worked correctly), passing `resource` and `id` as ordinary
// query-string parameters instead. Rewrites are a stable, framework-
// agnostic Vercel primitive evaluated before any function/static
// resolution, so this sidesteps the file-routing ambiguity entirely.
// (/api/auth/login etc. also match the same rewrite -- resource="auth",
// id="login" -- handleAuth below just treats that `id` as the action.)
//
// Every handler function below is the unchanged body of the
// corresponding former api/<resource>/index.ts + [id].ts (or
// api/auth/login.ts + logout.ts + me.ts) pair -- only how `id`/`action`
// is obtained changed (a function parameter here instead of reading
// req.query.id / req.query.action directly), and relative import depth
// (one level up now, not two).
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  verifyPassword,
  createSession,
  revokeSession,
  getUserFromToken,
  extractBearerToken,
} from '../lib/auth.js';
import { requireAuth, requireRole, requireOwnerOrRole, ForbiddenError, UnauthorizedError } from '../lib/rbac.js';
import { uploadCheckInPhoto, InvalidPhotoError } from '../lib/blob.js';

interface ApiRequest extends IncomingMessage {
  method?: string;
  headers: IncomingMessage['headers'];
  body?: unknown;
  query?: Record<string, string | string[]>;
}
interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface ProductItemInput {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ActivityInput {
  type: string;
  description: string;
  createdBy?: string;
  createdAt?: string;
}

function getParam(req: ApiRequest, name: string): string | undefined {
  const raw = req.query?.[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

// ---------------------------------------------------------------------
// /api/auth/login, /api/auth/logout, /api/auth/me
// ---------------------------------------------------------------------

// POST /api/auth/login — { email, password } -> { token, user }
//
// This is the real counterpart to the demo-account login in
// src/app/components/Login.tsx (which still authenticates client-side
// only — that cleanup is tracked separately as Fase 0). Once the frontend
// is wired to call this endpoint, Login.tsx's checks become a UI-only
// redirect; the actual credential check happens here, server-side.
async function handleLogin(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email dan password wajib diisi' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Same response whether the email doesn't exist or the password is
  // wrong — don't tell an attacker which half failed.
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ success: false, error: 'Email atau password salah' });
    return;
  }

  const { token, expiresAt } = await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.status(200).json({
    success: true,
    data: {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
}

// POST /api/auth/logout — revokes the session behind the bearer token.
// Because sessions are opaque backend rows (not JWTs), this is a real,
// immediate revoke rather than "the client just forgets the token."
async function handleLogout(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const token = extractBearerToken(req.headers.authorization);
  if (token) await revokeSession(token);
  res.status(200).json({ success: true });
}

// GET /api/auth/me — resolves the current bearer token to a user, or 401.
// This replaces AuthContext.tsx's current "read the user object back out
// of localStorage" restore-on-load with an actual backend-validated check.
async function handleMe(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
  if (!user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  res.status(200).json({ success: true, data: user });
}

async function handleAuth(action: string | undefined, req: ApiRequest, res: ApiResponse) {
  switch (action) {
    case 'login':
      await handleLogin(req, res);
      return;
    case 'logout':
      await handleLogout(req, res);
      return;
    case 'me':
      await handleMe(req, res);
      return;
    default:
      res.status(404).json({ success: false, error: 'Not found' });
  }
}

// ---------------------------------------------------------------------
// /api/distributors, /api/distributors/:id
//
// Bab 8 gap 1 ("hierarki distributor-toko belum ada") and Bab 9's
// approval workflow ("Field minimal": status, diajukan oleh, tanggal
// diajukan, disetujui/ditolak oleh, tanggal keputusan, catatan alasan —
// all already on the Distributor model).
//
// Any authenticated role can submit a new distributor for approval (the
// same "any sales role creates, manager+ decides" split used for
// api/leads); editing/deciding is restricted below.
// ---------------------------------------------------------------------

// Candidate approver roles per Bab 9's own open question ("Sales
// Manager regional atau tim Master Data/Admin?") — both, until that's
// decided one way.
const DISTRIBUTOR_APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'];

async function handleDistributors(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/distributors
      requireAuth(user);

      if (req.method === 'GET') {
        const distributors = await prisma.distributor.findMany({
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: distributors });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.code || !body.name) {
          res.status(400).json({ success: false, error: 'code dan name wajib diisi' });
          return;
        }
        const distributor = await prisma.distributor.create({
          data: {
            code: body.code as string,
            name: body.name as string,
            address: (body.address as string) ?? null,
            gpsLat: (body.gpsLat as number) ?? null,
            gpsLng: (body.gpsLng as number) ?? null,
            status: 'PENDING',
            submittedById: user.id,
            submittedAt: new Date(),
          },
        });
        res.status(201).json({ success: true, data: distributor });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/distributors/:id — including the Bab 9
    // approve/reject decision (a status change away from PENDING
    // auto-stamps decidedById/decidedAt; nothing else on this route does).
    if (req.method === 'GET') {
      requireAuth(user);
      const distributor = await prisma.distributor.findUnique({
        where: { id },
        include: { stores: true },
      });
      if (!distributor) {
        res.status(404).json({ success: false, error: 'Distributor not found' });
        return;
      }
      res.status(200).json({ success: true, data: distributor });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, DISTRIBUTOR_APPROVER_ROLES);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const nextStatus = body.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

      const current = await prisma.distributor.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ success: false, error: 'Distributor not found' });
        return;
      }
      const isDeciding = nextStatus !== undefined && nextStatus !== current.status && current.status === 'PENDING';

      const distributor = await prisma.distributor.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.address !== undefined && { address: body.address as string }),
          ...(body.gpsLat !== undefined && { gpsLat: body.gpsLat as number }),
          ...(body.gpsLng !== undefined && { gpsLng: body.gpsLng as number }),
          ...(nextStatus !== undefined && { status: nextStatus }),
          ...(isDeciding && {
            decidedById: user!.id,
            decidedAt: new Date(),
          }),
          ...(body.rejectionNote !== undefined && { rejectionNote: body.rejectionNote as string }),
        },
      });
      res.status(200).json({ success: true, data: distributor });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'MASTER_DATA_ADMIN']);
      await prisma.distributor.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Kode distributor sudah dipakai' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Distributor not found' });
      return;
    }
    console.error('[api/distributors] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/leads, /api/leads/:id
//
// Second of the three pilot modules named in Fase 1 item 2 ("mulai dari
// modul yang sudah punya pola api.ts (Lead, Opportunity, Product)").
// Unlike Product, a Lead is created and edited day-to-day by any sales
// role, not just master-data roles — so reads and creates only require
// being authenticated, and only delete is held back to manager+ (losing a
// lead record is the sensitive operation, not creating one).
// ---------------------------------------------------------------------

async function handleLeads(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST/DELETE /api/leads
      requireAuth(user);

      if (req.method === 'GET') {
        const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: leads });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.name || !body.company || !body.value) {
          res.status(400).json({ success: false, error: 'name, company, dan value wajib diisi' });
          return;
        }
        const lead = await prisma.lead.create({
          data: {
            name: body.name as string,
            company: body.company as string,
            email: (body.email as string) ?? null,
            phone: (body.phone as string) ?? null,
            status: (body.status as 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST') ?? 'NEW',
            value: body.value as number,
            source: (body.source as string) ?? null,
            assignedTo: (body.assignedTo as string) ?? user.id,
            notes: (body.notes as string) ?? null,
            // Long-tail UI-only fields (companies[]/position from
            // LeadManagement.tsx) with no dedicated column — same pattern
            // as Opportunity.extra.
            extra: (body.extra as object) ?? undefined,
          },
        });
        res.status(201).json({ success: true, data: lead });
        return;
      }

      if (req.method === 'DELETE') {
        // Bulk clear — LeadManagement.tsx's "Hapus Semua Lead" action.
        // Same restriction as single-record delete below.
        requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
        await prisma.lead.deleteMany({});
        res.status(200).json({ success: true });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/leads/:id
    if (req.method === 'GET') {
      requireAuth(user);
      const lead = await prisma.lead.findUnique({ where: { id }, include: { opportunities: true } });
      if (!lead) {
        res.status(404).json({ success: false, error: 'Lead not found' });
        return;
      }
      res.status(200).json({ success: true, data: lead });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const lead = await prisma.lead.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.company !== undefined && { company: body.company as string }),
          ...(body.email !== undefined && { email: body.email as string }),
          ...(body.phone !== undefined && { phone: body.phone as string }),
          ...(body.status !== undefined && { status: body.status as 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' }),
          ...(body.value !== undefined && { value: body.value as number }),
          ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo as string }),
          ...(body.notes !== undefined && { notes: body.notes as string }),
          ...(body.lastContact !== undefined && { lastContact: new Date(body.lastContact as string) }),
          ...(body.extra !== undefined && { extra: body.extra as object }),
        },
      });
      res.status(200).json({ success: true, data: lead });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.lead.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }
    console.error('[api/leads] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/clients, /api/clients/:id
//
// Fase 1 item 2: Client used to be entirely localStorage-backed via
// src/services/api.ts's clientsApi (ClientForm.tsx, SalesTeam.tsx,
// OpportunityFormNew.tsx) even though the Client model has existed in
// prisma/schema.prisma from the start (it just had no route). That meant
// every browser had its own private, never-shared list of clients -- and
// since the template this app started from was healthcare software, the
// model's optional fields (idSatusehat/idFaskesBpjs/statusAkreditasi/
// volumePasien/jumlahTempatTidur/npwpFaskes) are healthcare-shaped. They
// stay on the model as-is here (Fase 1 item 5, unifying the data model,
// is a separate piece of work) -- any client can simply leave them blank.
// ---------------------------------------------------------------------

function generateCustomerId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CUS-${date}-${rand}`;
}

async function handleClients(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/clients
      requireAuth(user);

      if (req.method === 'GET') {
        const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: clients });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.namaEntitas || !body.kategoriClient) {
          res.status(400).json({ success: false, error: 'namaEntitas dan kategoriClient wajib diisi' });
          return;
        }
        const client = await prisma.client.create({
          data: {
            idCustomer: (body.idCustomer as string) || generateCustomerId(),
            namaEntitas: body.namaEntitas as string,
            kategoriClient: body.kategoriClient as string,
            owner: (body.owner as string) ?? user.id,
            alamatLengkap: (body.alamatLengkap as string) ?? null,
            koordinatGps: (body.koordinatGps as string) ?? null,
            nomorTelepon: (body.nomorTelepon as string) ?? null,
            emailResmi: (body.emailResmi as string) ?? null,
            idSatusehat: (body.idSatusehat as string) ?? null,
            idFaskesBpjs: (body.idFaskesBpjs as string) ?? null,
            statusAkreditasi: (body.statusAkreditasi as string) ?? null,
            sistemLama: (body.sistemLama as string) ?? null,
            volumePasien: (body.volumePasien as string) ?? null,
            jumlahTempatTidur: (body.jumlahTempatTidur as string) ?? null,
            namaPic: (body.namaPic as string) ?? null,
            jabatanPic: (body.jabatanPic as string) ?? null,
            whatsappPic: (body.whatsappPic as string) ?? null,
            statusHubungan: (body.statusHubungan as string) ?? null,
            paketAktif: (body.paketAktif as string) ?? null,
            modulTambahan: (body.modulTambahan as string) ?? null,
            statusKontrak: (body.statusKontrak as string) ?? null,
            statusSubscription: (body.statusSubscription as string) ?? null,
            tanggalMulaiLangganan: (body.tanggalMulaiLangganan as string) ?? null,
            tanggalHabisKontrak: (body.tanggalHabisKontrak as string) ?? null,
            totalNilaiKontrak: (body.totalNilaiKontrak as string) ?? null,
            fileKontrakDigital: (body.fileKontrakDigital as string) ?? null,
            statusEsign: (body.statusEsign as string) ?? null,
            npwpFaskes: (body.npwpFaskes as string) ?? null,
            salesFlow: (body.salesFlow as 'PROJECT' | 'RETAIL') ?? null,
            distributorId: (body.distributorId as string) ?? null,
            storeId: (body.storeId as string) ?? null,
          },
        });
        res.status(201).json({ success: true, data: client });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/clients/:id
    if (req.method === 'GET') {
      requireAuth(user);
      const client = await prisma.client.findUnique({ where: { id }, include: { opportunities: true } });
      if (!client) {
        res.status(404).json({ success: false, error: 'Client not found' });
        return;
      }
      res.status(200).json({ success: true, data: client });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const editableFields = [
        'namaEntitas', 'kategoriClient', 'owner', 'alamatLengkap', 'koordinatGps',
        'nomorTelepon', 'emailResmi', 'idSatusehat', 'idFaskesBpjs', 'statusAkreditasi',
        'sistemLama', 'volumePasien', 'jumlahTempatTidur', 'namaPic', 'jabatanPic',
        'whatsappPic', 'statusHubungan', 'paketAktif', 'modulTambahan', 'statusKontrak',
        'statusSubscription', 'tanggalMulaiLangganan', 'tanggalHabisKontrak',
        'totalNilaiKontrak', 'fileKontrakDigital', 'statusEsign', 'npwpFaskes',
        'salesFlow', 'distributorId', 'storeId',
      ] as const;
      const data: Record<string, unknown> = {};
      for (const field of editableFields) {
        if (body[field] !== undefined) data[field] = body[field];
      }
      const client = await prisma.client.update({ where: { id }, data });
      res.status(200).json({ success: true, data: client });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.client.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Client not found' });
      return;
    }
    console.error('[api/clients] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/sales-reps, /api/sales-reps/:id
//
// Fase 1 item 2 (23 Sep 2026): SalesRep already existed in
// prisma/schema.prisma (a deliberately minimal identity record -- see
// src/types/salesRep.ts -- just enough for PerformanceTarget/
// CommissionRecord to reference) but had no route, so
// salesRepsRepository.ts was localStorage-only. Plain CRUD, no
// healthcare-shaped fields, no schema gap.
// ---------------------------------------------------------------------

async function handleSalesReps(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      requireAuth(user);

      if (req.method === 'GET') {
        const salesReps = await prisma.salesRep.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: salesReps });
        return;
      }

      if (req.method === 'POST') {
        requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.name || !body.email || !body.role) {
          res.status(400).json({ success: false, error: 'name, email, dan role wajib diisi' });
          return;
        }
        const existing = await prisma.salesRep.findUnique({ where: { email: body.email as string } });
        if (existing) {
          res.status(409).json({ success: false, error: `Email "${body.email}" sudah dipakai sales rep lain` });
          return;
        }
        const salesRep = await prisma.salesRep.create({
          data: {
            name: body.name as string,
            email: body.email as string,
            role: body.role as string,
          },
        });
        res.status(201).json({ success: true, data: salesRep });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    if (req.method === 'GET') {
      requireAuth(user);
      const salesRep = await prisma.salesRep.findUnique({ where: { id } });
      if (!salesRep) {
        res.status(404).json({ success: false, error: 'Sales rep not found' });
        return;
      }
      res.status(200).json({ success: true, data: salesRep });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const salesRep = await prisma.salesRep.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.email !== undefined && { email: body.email as string }),
          ...(body.role !== undefined && { role: body.role as string }),
        },
      });
      res.status(200).json({ success: true, data: salesRep });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
      await prisma.salesRep.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Sales rep not found' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Email sudah dipakai sales rep lain' });
      return;
    }
    console.error('[api/sales-reps] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/performance-targets, /api/performance-targets/:id
//
// Fase 1 item 2 (23 Sep 2026): mirrors src/types/performanceTarget.ts's
// "exclusive arc" rule (exactly one of productId/salesRepId/territoryId).
// Filtering by entity (getForEntity in performanceTargetsRepository.ts)
// is done client-side over the full list rather than via extra query
// params -- no existing route in this file relies on anything past
// resource/id surviving vercel.json's rewrite, so this doesn't either.
// ---------------------------------------------------------------------

function validatePerformanceTargetBody(body: Record<string, unknown>): string | null {
  const entityCount = [body.productId, body.salesRepId, body.territoryId].filter(
    (v) => v !== undefined && v !== null
  ).length;
  if (entityCount !== 1) return 'Harus mengisi tepat satu dari productId, salesRepId, atau territoryId';
  if (!body.period) return 'Period wajib diisi';
  if (typeof body.target !== 'number' || body.target < 0) return 'Target harus angka >= 0';
  return null;
}

async function handlePerformanceTargets(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      requireAuth(user);

      if (req.method === 'GET') {
        const targets = await prisma.performanceTarget.findMany({ orderBy: { period: 'desc' } });
        res.status(200).json({ success: true, data: targets });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const validationError = validatePerformanceTargetBody(body);
        if (validationError) {
          res.status(400).json({ success: false, error: validationError });
          return;
        }
        const target = await prisma.performanceTarget.create({
          data: {
            productId: (body.productId as string) ?? null,
            salesRepId: (body.salesRepId as string) ?? null,
            territoryId: (body.territoryId as string) ?? null,
            period: new Date(body.period as string),
            target: body.target as number,
            actual: (body.actual as number) ?? 0,
            forecast: (body.forecast as number) ?? null,
          },
        });
        res.status(201).json({ success: true, data: target });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    if (req.method === 'GET') {
      requireAuth(user);
      const target = await prisma.performanceTarget.findUnique({ where: { id } });
      if (!target) {
        res.status(404).json({ success: false, error: 'Performance target not found' });
        return;
      }
      res.status(200).json({ success: true, data: target });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const target = await prisma.performanceTarget.update({
        where: { id },
        data: {
          ...(body.target !== undefined && { target: body.target as number }),
          ...(body.actual !== undefined && { actual: body.actual as number }),
          ...(body.forecast !== undefined && { forecast: body.forecast as number }),
          ...(body.period !== undefined && { period: new Date(body.period as string) }),
        },
      });
      res.status(200).json({ success: true, data: target });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.performanceTarget.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Performance target not found' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Sudah ada target untuk entity dan period yang sama' });
      return;
    }
    console.error('[api/performance-targets] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/commissions, /api/commissions/:id
//
// Fase 1 item 2 (23 Sep 2026). CommissionStatus is a SCREAMING_SNAKE_CASE
// Prisma enum server-side (PENDING/APPROVED/PAID), a lower-case string
// literal client-side (src/types/commission.ts) -- same translation
// pattern as Lead.status in leadsRepository.ts.
// ---------------------------------------------------------------------

async function handleCommissions(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      requireAuth(user);

      if (req.method === 'GET') {
        const records = await prisma.commissionRecord.findMany({ orderBy: { period: 'desc' } });
        res.status(200).json({ success: true, data: records });
        return;
      }

      if (req.method === 'POST') {
        requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.salesRepId || !body.period) {
          res.status(400).json({ success: false, error: 'salesRepId dan period wajib diisi' });
          return;
        }
        const record = await prisma.commissionRecord.create({
          data: {
            salesRepId: body.salesRepId as string,
            period: new Date(body.period as string),
            baseCommission: (body.baseCommission as number) ?? 0,
            bonuses: (body.bonuses as number) ?? 0,
            totalCommission: (body.totalCommission as number) ?? 0,
            status: ((body.status as string)?.toUpperCase() as 'PENDING' | 'APPROVED' | 'PAID') ?? 'PENDING',
            deals: (body.deals as number) ?? 0,
            paymentDate: body.paymentDate ? new Date(body.paymentDate as string) : null,
          },
        });
        res.status(201).json({ success: true, data: record });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    if (req.method === 'GET') {
      requireAuth(user);
      const record = await prisma.commissionRecord.findUnique({ where: { id } });
      if (!record) {
        res.status(404).json({ success: false, error: 'Commission record not found' });
        return;
      }
      res.status(200).json({ success: true, data: record });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const record = await prisma.commissionRecord.update({
        where: { id },
        data: {
          ...(body.baseCommission !== undefined && { baseCommission: body.baseCommission as number }),
          ...(body.bonuses !== undefined && { bonuses: body.bonuses as number }),
          ...(body.totalCommission !== undefined && { totalCommission: body.totalCommission as number }),
          ...(body.status !== undefined && { status: (body.status as string).toUpperCase() as 'PENDING' | 'APPROVED' | 'PAID' }),
          ...(body.deals !== undefined && { deals: body.deals as number }),
          ...(body.paymentDate !== undefined && {
            paymentDate: body.paymentDate ? new Date(body.paymentDate as string) : null,
          }),
        },
      });
      res.status(200).json({ success: true, data: record });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.commissionRecord.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Commission record not found' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Sudah ada payout record untuk sales rep dan period yang sama' });
      return;
    }
    console.error('[api/commissions] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/opportunities, /api/opportunities/:id
//
// Third of the three pilot modules named in Fase 1 item 2. Opportunity
// carries the ~40 UI-only "Overview/Commercial/Technical Detail" fields
// from src/types/opportunity.ts in a single `extra` JSON column rather
// than one column each (see the modeling note at the top of
// prisma/schema.prisma) — callers pass those under body.extra and
// everything else maps to real columns.
// ---------------------------------------------------------------------

async function handleOpportunities(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/opportunities
      requireAuth(user);

      if (req.method === 'GET') {
        const opportunities = await prisma.opportunity.findMany({
          include: { products: true, activities: true },
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: opportunities });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.name || !body.clientName || !body.contactPerson || !body.closeDate) {
          res.status(400).json({
            success: false,
            error: 'name, clientName, contactPerson, dan closeDate wajib diisi',
          });
          return;
        }
        const products = (body.products as ProductItemInput[] | undefined) ?? [];

        const opportunity = await prisma.opportunity.create({
          data: {
            name: body.name as string,
            leadId: (body.leadId as string) ?? null,
            clientId: (body.clientId as string) ?? null,
            clientName: body.clientName as string,
            contactPerson: body.contactPerson as string,
            email: (body.email as string) ?? null,
            phone: (body.phone as string) ?? null,
            totalValue: (body.totalValue as number) ?? 0,
            currency: (body.currency as string) ?? 'IDR',
            probability: (body.probability as number) ?? 0,
            closeDate: new Date(body.closeDate as string),
            stage: (body.stage as 'PROSPECTING' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST') ?? 'PROSPECTING',
            status: (body.status as 'OPEN' | 'WON' | 'LOST') ?? 'OPEN',
            ownerId: (body.ownerId as string) ?? user.id,
            ownerName: (body.ownerName as string) ?? user.name,
            source: (body.source as string) ?? null,
            description: (body.description as string) ?? null,
            notes: (body.notes as string) ?? null,
            salesFlow: (body.salesFlow as 'PROJECT' | 'RETAIL') ?? null,
            extra: (body.extra as object) ?? undefined,
            createdBy: user.id,
            products: {
              create: products.map((p) => ({
                productId: p.productId ?? null,
                productName: p.productName,
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                totalPrice: p.totalPrice,
              })),
            },
          },
          include: { products: true, activities: true },
        });
        res.status(201).json({ success: true, data: opportunity });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/POST/DELETE /api/opportunities/:id — POST logs an activity
    // (src/types/opportunity.ts's Activity[]) against this opportunity.
    if (req.method === 'GET') {
      requireAuth(user);
      const opportunity = await prisma.opportunity.findUnique({
        where: { id },
        include: { products: true, activities: true },
      });
      if (!opportunity) {
        res.status(404).json({ success: false, error: 'Opportunity not found' });
        return;
      }
      res.status(200).json({ success: true, data: opportunity });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      // Bab 10 gap #5: ownership check -- see requireOwnerOrRole's doc
      // comment in lib/rbac.ts.
      const currentOpportunity = await prisma.opportunity.findUnique({ where: { id } });
      if (!currentOpportunity) {
        res.status(404).json({ success: false, error: 'Opportunity not found' });
        return;
      }
      requireOwnerOrRole(user, currentOpportunity.ownerId, ['SUPER_ADMIN', 'SALES_MANAGER']);
      const body = (req.body ?? {}) as Record<string, unknown>;
      // FR-04 (src/types/opportunity.ts): closeReason/closeDetail are
      // required before an opportunity can move to Closed Won/Lost —
      // enforced here too, not just in the form UI.
      const nextStatus = body.status as 'OPEN' | 'WON' | 'LOST' | undefined;
      if (nextStatus && nextStatus !== 'OPEN' && !body.closeReason) {
        res.status(400).json({ success: false, error: 'closeReason wajib diisi untuk Closed Won/Lost' });
        return;
      }
      const opportunity = await prisma.opportunity.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.clientName !== undefined && { clientName: body.clientName as string }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson as string }),
          ...(body.totalValue !== undefined && { totalValue: body.totalValue as number }),
          ...(body.probability !== undefined && { probability: body.probability as number }),
          ...(body.closeDate !== undefined && { closeDate: new Date(body.closeDate as string) }),
          ...(body.actualCloseDate !== undefined && { actualCloseDate: new Date(body.actualCloseDate as string) }),
          ...(body.stage !== undefined && { stage: body.stage as 'PROSPECTING' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST' }),
          ...(nextStatus !== undefined && { status: nextStatus }),
          ...(body.lossReason !== undefined && { lossReason: body.lossReason as string }),
          ...(body.closeReason !== undefined && { closeReason: body.closeReason as string }),
          ...(body.closeDetail !== undefined && { closeDetail: body.closeDetail as string }),
          ...(body.notes !== undefined && { notes: body.notes as string }),
          ...(body.extra !== undefined && { extra: body.extra as object }),
          // The UI always sends the complete current products/activities
          // array on every save (never a delta), so a full delete+recreate
          // is the simplest correct sync — see opportunitiesRepository.ts's
          // file header for why this is needed here at all (the pilot
          // route originally only handled scalar columns).
          ...(body.products !== undefined && {
            products: {
              deleteMany: {},
              create: (body.products as ProductItemInput[]).map((p) => ({
                productId: p.productId || null,
                productName: p.productName,
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                totalPrice: p.totalPrice,
              })),
            },
          }),
          ...(body.activities !== undefined && {
            activities: {
              deleteMany: {},
              create: (body.activities as ActivityInput[]).map((a) => ({
                type: a.type,
                description: a.description,
                createdBy: a.createdBy ?? user!.id,
                createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
              })),
            },
          }),
        },
        include: { products: true, activities: true },
      });
      res.status(200).json({ success: true, data: opportunity });
      return;
    }

    if (req.method === 'POST') {
      // Log an activity against this opportunity.
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (!body.type || !body.description) {
        res.status(400).json({ success: false, error: 'type dan description wajib diisi' });
        return;
      }
      const activity = await prisma.opportunityActivity.create({
        data: {
          opportunityId: id,
          type: body.type as string,
          description: body.description as string,
          createdBy: user.id,
        },
      });
      res.status(201).json({ success: true, data: activity });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.opportunity.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error('[api/opportunities] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/products, /api/products/:id
//
// The pilot module for Fase 1 item 2 ("Migrasikan data dari localStorage
// ke database terpusat, mulai dari modul yang sudah punya pola api.ts
// (Lead, Opportunity, Product)"). Product was picked first here because
// src/types/product.ts is already the unified model (item 5) and
// prisma/schema.prisma's Product table is a direct port of the
// already-reviewed db/migrations/0001_unified_product_model.sql — the
// least amount of new modeling risk to wire up first.
//
// Response shape matches src/services/api.ts's existing
// { success, data?, error? } convention so the frontend repository layer
// (src/services/productsRepository.ts) can eventually point at this
// endpoint instead of localStorage without changing its own call sites.
// ---------------------------------------------------------------------

async function handleProducts(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/products
      if (req.method === 'GET') {
        // Any authenticated role can read the catalog.
        requireAuth(user);
        const products = await prisma.product.findMany({
          include: { softwareAttrs: true, physicalAttrs: true },
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: products });
        return;
      }

      if (req.method === 'POST') {
        // Creating/editing the catalog is a master-data action, not a
        // day-to-day sales action — restrict it accordingly.
        requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
        const body = (req.body ?? {}) as Record<string, unknown>;
        const productType = body.productType as 'SOFTWARE' | 'PHYSICAL';
        const softwareAttrs = body.softwareAttrs as Record<string, unknown> | undefined;
        const physicalAttrs = body.physicalAttrs as Record<string, unknown> | undefined;

        const product = await prisma.product.create({
          data: {
            sku: body.sku as string,
            name: body.name as string,
            category: body.category as string,
            price: body.price as number,
            currency: (body.currency as string) ?? 'IDR',
            description: (body.description as string | undefined) ?? null,
            status: (body.status as 'ACTIVE' | 'DISCONTINUED') ?? 'ACTIVE',
            productType,
            stock: (body.stock as number) ?? 0,
            sold: (body.sold as number) ?? 0,
            features: (body.features as string[]) ?? [],
            // Fase 1 item 5: same create call, exclusive-arc subtype row —
            // src/services/productsRepository.ts sends exactly one of
            // these depending on productType.
            ...(productType === 'SOFTWARE' && softwareAttrs
              ? {
                  softwareAttrs: {
                    create: {
                      licenseTier: softwareAttrs.licenseTier as string | undefined,
                      billingCycle: softwareAttrs.billingCycle as
                        | 'MONTHLY'
                        | 'YEARLY'
                        | 'ONE_TIME'
                        | undefined,
                      modules: (softwareAttrs.modules as string[]) ?? [],
                      seatLimit: softwareAttrs.seatLimit as number | undefined,
                      deploymentType: softwareAttrs.deploymentType as
                        | 'CLOUD'
                        | 'ON_PREMISE'
                        | 'HYBRID'
                        | undefined,
                    },
                  },
                }
              : {}),
            ...(productType === 'PHYSICAL' && physicalAttrs
              ? {
                  physicalAttrs: {
                    create: {
                      unitOfMeasure: physicalAttrs.unitOfMeasure as string,
                      color: physicalAttrs.color as string | undefined,
                      specification: physicalAttrs.specification as string | undefined,
                      weightKg: physicalAttrs.weightKg as number | undefined,
                    },
                  },
                }
              : {}),
          },
          include: { softwareAttrs: true, physicalAttrs: true },
        });
        res.status(201).json({ success: true, data: product });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/products/:id
    if (req.method === 'GET') {
      requireAuth(user);
      const product = await prisma.product.findUnique({
        where: { id },
        include: { softwareAttrs: true, physicalAttrs: true },
      });
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.status(200).json({ success: true, data: product });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const softwareAttrs = body.softwareAttrs as Record<string, unknown> | undefined;
      const physicalAttrs = body.physicalAttrs as Record<string, unknown> | undefined;
      const product = await prisma.product.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.category !== undefined && { category: body.category as string }),
          ...(body.price !== undefined && { price: body.price as number }),
          ...(body.currency !== undefined && { currency: body.currency as string }),
          ...(body.description !== undefined && { description: body.description as string }),
          ...(body.status !== undefined && { status: body.status as 'ACTIVE' | 'DISCONTINUED' }),
          ...(body.stock !== undefined && { stock: body.stock as number }),
          ...(body.sold !== undefined && { sold: body.sold as number }),
          ...(body.features !== undefined && { features: body.features as string[] }),
          // upsert rather than update: a product created before this
          // field existed (or the exclusive-arc row was skipped for some
          // reason) may not have a subtype row yet.
          ...(softwareAttrs !== undefined && {
            softwareAttrs: {
              upsert: {
                create: {
                  licenseTier: softwareAttrs.licenseTier as string | undefined,
                  billingCycle: softwareAttrs.billingCycle as
                    | 'MONTHLY'
                    | 'YEARLY'
                    | 'ONE_TIME'
                    | undefined,
                  modules: (softwareAttrs.modules as string[]) ?? [],
                  seatLimit: softwareAttrs.seatLimit as number | undefined,
                  deploymentType: softwareAttrs.deploymentType as
                    | 'CLOUD'
                    | 'ON_PREMISE'
                    | 'HYBRID'
                    | undefined,
                },
                update: {
                  licenseTier: softwareAttrs.licenseTier as string | undefined,
                  billingCycle: softwareAttrs.billingCycle as
                    | 'MONTHLY'
                    | 'YEARLY'
                    | 'ONE_TIME'
                    | undefined,
                  modules: (softwareAttrs.modules as string[]) ?? [],
                  seatLimit: softwareAttrs.seatLimit as number | undefined,
                  deploymentType: softwareAttrs.deploymentType as
                    | 'CLOUD'
                    | 'ON_PREMISE'
                    | 'HYBRID'
                    | undefined,
                },
              },
            },
          }),
          ...(physicalAttrs !== undefined && {
            physicalAttrs: {
              upsert: {
                create: {
                  unitOfMeasure: physicalAttrs.unitOfMeasure as string,
                  color: physicalAttrs.color as string | undefined,
                  specification: physicalAttrs.specification as string | undefined,
                  weightKg: physicalAttrs.weightKg as number | undefined,
                },
                update: {
                  unitOfMeasure: physicalAttrs.unitOfMeasure as string,
                  color: physicalAttrs.color as string | undefined,
                  specification: physicalAttrs.specification as string | undefined,
                  weightKg: physicalAttrs.weightKg as number | undefined,
                },
              },
            },
          }),
        },
        include: { softwareAttrs: true, physicalAttrs: true },
      });
      res.status(200).json({ success: true, data: product });
      return;
    }

    if (req.method === 'DELETE') {
      // Deleting master data is tighter than editing it.
      requireRole(user, ['SUPER_ADMIN', 'MASTER_DATA_ADMIN']);
      await prisma.product.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    // Prisma P2002 = unique constraint violation — here, always the sku.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'SKU sudah dipakai produk lain' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    console.error('[api/products] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/stores, /api/stores/:id
//
// Same pattern as api/distributors, one level down the Bab 5 hierarchy (a
// Store optionally belongs to a Distributor).
// ---------------------------------------------------------------------

const STORE_APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'];

async function handleStores(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/stores
      requireAuth(user);

      if (req.method === 'GET') {
        const stores = await prisma.store.findMany({
          include: { distributor: true },
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: stores });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.code || !body.name) {
          res.status(400).json({ success: false, error: 'code dan name wajib diisi' });
          return;
        }
        const store = await prisma.store.create({
          data: {
            code: body.code as string,
            name: body.name as string,
            distributorId: (body.distributorId as string) ?? null,
            address: (body.address as string) ?? null,
            gpsLat: (body.gpsLat as number) ?? null,
            gpsLng: (body.gpsLng as number) ?? null,
            status: 'PENDING',
            submittedById: user.id,
            submittedAt: new Date(),
          },
        });
        res.status(201).json({ success: true, data: store });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/stores/:id — same pattern as
    // handleDistributors above.
    if (req.method === 'GET') {
      requireAuth(user);
      const store = await prisma.store.findUnique({
        where: { id },
        include: { distributor: true, tasks: true },
      });
      if (!store) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }
      res.status(200).json({ success: true, data: store });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, STORE_APPROVER_ROLES);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const nextStatus = body.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;

      const current = await prisma.store.findUnique({ where: { id } });
      if (!current) {
        res.status(404).json({ success: false, error: 'Store not found' });
        return;
      }
      const isDeciding = nextStatus !== undefined && nextStatus !== current.status && current.status === 'PENDING';

      const store = await prisma.store.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.distributorId !== undefined && { distributorId: body.distributorId as string }),
          ...(body.address !== undefined && { address: body.address as string }),
          ...(body.gpsLat !== undefined && { gpsLat: body.gpsLat as number }),
          ...(body.gpsLng !== undefined && { gpsLng: body.gpsLng as number }),
          ...(nextStatus !== undefined && { status: nextStatus }),
          ...(isDeciding && {
            decidedById: user!.id,
            decidedAt: new Date(),
          }),
          ...(body.rejectionNote !== undefined && { rejectionNote: body.rejectionNote as string }),
        },
      });
      res.status(200).json({ success: true, data: store });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'MASTER_DATA_ADMIN']);
      await prisma.store.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Kode toko sudah dipakai' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }
    console.error('[api/stores] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/tasks, /api/tasks/:id
//
// Task module, wired to a real backend for the first time (previously
// schema-only groundwork for Bab 8 gap 2's check-in feature; see the
// modeling note on the Task model in schema.prisma). Any authenticated
// role can list and create tasks, matching the same "any sales role
// creates" convention already used for api/leads and api/opportunities.
// ---------------------------------------------------------------------

async function handleTasks(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/tasks
      requireAuth(user);

      if (req.method === 'GET') {
        const tasks = await prisma.task.findMany({
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: tasks });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.title) {
          res.status(400).json({ success: false, error: 'title wajib diisi' });
          return;
        }
        const task = await prisma.task.create({
          data: {
            title: body.title as string,
            description: (body.description as string) ?? null,
            status: (body.status as 'TODO' | 'IN_PROGRESS' | 'COMPLETED') ?? 'TODO',
            priority: (body.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') ?? 'MEDIUM',
            type: (body.type as 'VISIT' | 'CALL' | 'EMAIL' | 'OTHER') ?? 'OTHER',
            category: (body.category as string) ?? null,
            dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
            assignedTo: (body.assignedTo as string) ?? null,
            createdBy: (body.createdBy as string) ?? user.name,
            opportunityId: (body.opportunityId as string) ?? null,
            storeId: (body.storeId as string) ?? null,
            ownerId: (body.ownerId as string) ?? user.id,
            extra: (body.extra as object) ?? undefined,
          },
        });
        res.status(201).json({ success: true, data: task });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/POST/DELETE /api/tasks/:id — POST is check-in (Bab 8 gap 2:
    // GPS + "foto toko bertanggal").
    if (req.method === 'GET') {
      requireAuth(user);
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      res.status(200).json({ success: true, data: task });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      // Bab 10 gap #5: ownership check -- see requireOwnerOrRole's doc
      // comment in lib/rbac.ts.
      const currentTask = await prisma.task.findUnique({ where: { id } });
      if (!currentTask) {
        res.status(404).json({ success: false, error: 'Task not found' });
        return;
      }
      requireOwnerOrRole(user, currentTask.ownerId, ['SUPER_ADMIN', 'SALES_MANAGER']);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const task = await prisma.task.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title as string }),
          ...(body.description !== undefined && { description: body.description as string }),
          ...(body.status !== undefined && { status: body.status as 'TODO' | 'IN_PROGRESS' | 'COMPLETED' }),
          ...(body.priority !== undefined && { priority: body.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }),
          ...(body.type !== undefined && { type: body.type as 'VISIT' | 'CALL' | 'EMAIL' | 'OTHER' }),
          ...(body.category !== undefined && { category: body.category as string }),
          ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate as string) : null }),
          ...(body.completedDate !== undefined && {
            completedDate: body.completedDate ? new Date(body.completedDate as string) : null,
          }),
          ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo as string }),
          ...(body.opportunityId !== undefined && { opportunityId: body.opportunityId as string }),
          ...(body.storeId !== undefined && { storeId: body.storeId as string }),
          ...(body.extra !== undefined && { extra: body.extra as object }),
        },
      });
      res.status(200).json({ success: true, data: task });
      return;
    }

    if (req.method === 'POST') {
      // FR-03 check-in: GPS (always) + foto display toko bertanggal
      // (optional — a check-in without camera/location permission still
      // saves, matching the existing localStorage behavior in
      // TaskManagement.tsx's handleCheckIn).
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;

      let checkInPhotoUrl: string | undefined;
      if (body.photoDataUrl) {
        try {
          checkInPhotoUrl = await uploadCheckInPhoto(body.photoDataUrl as string, id);
        } catch (err) {
          if (err instanceof InvalidPhotoError) {
            res.status(400).json({ success: false, error: err.message });
            return;
          }
          throw err;
        }
      }

      const task = await prisma.task.update({
        where: { id },
        data: {
          checkInAt: new Date(),
          checkInLat: (body.lat as number) ?? null,
          checkInLng: (body.lng as number) ?? null,
          checkInAccuracy: (body.accuracy as number) ?? null,
          locationValidated: (body.locationValidated as boolean) ?? (body.lat != null && body.lng != null),
          ...(checkInPhotoUrl && { checkInPhotoUrl }),
        },
      });
      res.status(200).json({ success: true, data: task });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.task.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    console.error('[api/tasks] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

function generateDiscountRequestNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DR-${date}-${rand}`;
}

const DISCOUNT_LEVEL_LABELS = ['Sales Executive', 'Sales Manager', 'Sales Director', 'C-Level'];

function discountLevelLabel(level: number): string {
  return DISCOUNT_LEVEL_LABELS[level - 1] ?? 'C-Level';
}

function discountLevelForPercent(pct: number): number {
  if (pct <= 10) return 1;
  if (pct <= 20) return 2;
  if (pct <= 30) return 3;
  return 4;
}

// Business decision (Bab 10 #3 follow-up, confirmed with user): level 2
// decisions require Sales Manager (or Super Admin as override); levels 3
// and 4 -- "Sales Director"/"C-Level" in the UI's own policy labels,
// which don't exist as real login roles -- escalate to Super Admin only.
// Level 1 is auto-self-approved at creation (see handleDiscountApprovals'
// POST) and should never reach a PUT decision in practice; SUPER_ADMIN is
// kept as a permissive fallback there rather than blocking entirely.
function discountApproverRolesForLevel(level: number): Role[] {
  if (level >= 3) return ['SUPER_ADMIN'];
  if (level === 2) return ['SUPER_ADMIN', 'SALES_MANAGER'];
  return ['SUPER_ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'SALES_REPRESENTATIVE', 'MASTER_DATA_ADMIN'];
}

// ---------------------------------------------------------------------
// /api/discount-approvals, /api/discount-approvals/:id
//
// Bab 10 gap #3 (Rencana Insight doc): DiscountApprovalSystem.tsx already
// had a full multi-level approval UI (margin calculation, approval
// levels, counter-offer, conditional approval), but every request lived
// only in a hardcoded useState array in the component -- approve/reject
// never even updated that in-memory array, only showed a toast. This is
// its real backend home (see the schema comment on DiscountApprovalRequest
// in prisma/schema.prisma).
//
// Level 2-4 approver labels ("Sales Manager"/"Sales Director"/"C-Level")
// are a business escalation policy, not this app's login Role enum (Role
// only has SUPER_ADMIN/SALES_MANAGER/SALES_REPRESENTATIVE/
// SALES_EXECUTIVE/MASTER_DATA_ADMIN -- there is no "Sales Director" or
// "C-Level" account type here). Reconciling the two policy tiers with
// real login roles is a business decision this session doesn't make, so
// deciding a step only requires being authenticated (requireAuth), same
// as PerformanceTargets -- it is NOT role-gated to a specific login role
// yet. Flagged as a follow-up, not silently assumed solved.
// ---------------------------------------------------------------------

async function handleDiscountApprovals(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/discount-approvals
      requireAuth(user);

      if (req.method === 'GET') {
        const requests = await prisma.discountApprovalRequest.findMany({
          include: { steps: { orderBy: { level: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: requests });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (
          !body.clientName ||
          !body.productName ||
          body.originalPrice === undefined ||
          body.discountPercent === undefined ||
          !body.reason ||
          body.originalMargin === undefined ||
          body.proposedMargin === undefined
        ) {
          res.status(400).json({
            success: false,
            error:
              'clientName, productName, originalPrice, discountPercent, reason, originalMargin, dan proposedMargin wajib diisi',
          });
          return;
        }

        const originalPrice = Number(body.originalPrice);
        const discountPercent = Number(body.discountPercent);
        const discountAmount = originalPrice * (discountPercent / 100);
        const finalPrice = originalPrice - discountAmount;
        const level = discountLevelForPercent(discountPercent);
        const selfApproved = level === 1;

        const steps = Array.from({ length: level }, (_, i) => {
          const stepLevel = i + 1;
          if (stepLevel === 1) {
            return {
              level: 1,
              approverName: user.name,
              approverRole: discountLevelLabel(1),
              action: 'approved' as const,
              decidedAt: new Date(),
              comment: 'Self-approval sesuai kewenangan (diskon <= 10%)',
            };
          }
          return {
            level: stepLevel,
            approverName: '',
            approverRole: discountLevelLabel(stepLevel),
            action: 'pending' as const,
          };
        });

        const request = await prisma.discountApprovalRequest.create({
          data: {
            requestNumber: generateDiscountRequestNumber(),
            clientName: body.clientName as string,
            opportunityId: (body.opportunityId as string) ?? null,
            productName: body.productName as string,
            originalPrice,
            discountPercent,
            discountAmount,
            finalPrice,
            requestedById: user.id,
            requestedByName: user.name,
            reason: body.reason as string,
            status: selfApproved ? 'approved' : 'pending',
            currentApprover: selfApproved ? '-' : discountLevelLabel(2),
            approvalLevel: selfApproved ? 1 : 2,
            urgency: (body.urgency as string) ?? 'medium',
            validUntil: body.validUntil ? new Date(body.validUntil as string) : null,
            originalMargin: Number(body.originalMargin),
            proposedMargin: Number(body.proposedMargin),
            region: (body.region as string) ?? null,
            steps: { create: steps },
          },
          include: { steps: { orderBy: { level: 'asc' } } },
        });
        res.status(201).json({ success: true, data: request });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/discount-approvals/:id -- PUT is the
    // approve/reject/counter-offer decision on whichever level is
    // currently pending.
    if (req.method === 'GET') {
      requireAuth(user);
      const request = await prisma.discountApprovalRequest.findUnique({
        where: { id },
        include: { steps: { orderBy: { level: 'asc' } } },
      });
      if (!request) {
        res.status(404).json({ success: false, error: 'Discount request not found' });
        return;
      }
      res.status(200).json({ success: true, data: request });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const action = body.action as 'approve' | 'reject' | 'counter-offer' | undefined;
      if (!action) {
        res.status(400).json({ success: false, error: 'action wajib diisi (approve/reject/counter-offer)' });
        return;
      }

      const current = await prisma.discountApprovalRequest.findUnique({
        where: { id },
        include: { steps: true },
      });
      if (!current) {
        res.status(404).json({ success: false, error: 'Discount request not found' });
        return;
      }
      requireRole(user, discountApproverRolesForLevel(current.approvalLevel));
      if (current.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: `Pengajuan sudah berstatus ${current.status}, tidak bisa diputuskan lagi`,
        });
        return;
      }
      const pendingStep = current.steps.find((s) => s.level === current.approvalLevel && s.action === 'pending');
      if (!pendingStep) {
        res.status(400).json({ success: false, error: 'Tidak ada level yang sedang menunggu approval' });
        return;
      }

      const stepAction = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'counter-offer';
      const maxLevel = Math.max(...current.steps.map((s) => s.level));
      const isLastLevel = current.approvalLevel >= maxLevel;

      const request = await prisma.discountApprovalRequest.update({
        where: { id },
        data: {
          status:
            action === 'reject'
              ? 'rejected'
              : action === 'counter-offer'
              ? 'counter-offer'
              : isLastLevel
              ? 'approved'
              : 'pending',
          currentApprover: action === 'approve' && !isLastLevel ? discountLevelLabel(current.approvalLevel + 1) : '-',
          approvalLevel: action === 'approve' && !isLastLevel ? current.approvalLevel + 1 : current.approvalLevel,
          ...(body.conditions !== undefined && { conditions: body.conditions as string }),
          steps: {
            update: {
              where: { id: pendingStep.id },
              data: {
                action: stepAction,
                decidedAt: new Date(),
                approverName: user.name,
                comment: (body.comment as string) ?? null,
                counterOfferPercent:
                  body.counterOfferPercent !== undefined ? Number(body.counterOfferPercent) : null,
                conditionsAdded: (body.conditionsAdded as string) ?? null,
              },
            },
          },
        },
        include: { steps: { orderBy: { level: 'asc' } } },
      });
      res.status(200).json({ success: true, data: request });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.discountApprovalRequest.delete({ where: { id } });
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Nomor pengajuan sudah dipakai, coba lagi' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'Discount request not found' });
      return;
    }
    console.error('[api/discount-approvals] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// Top-level dispatch
// ---------------------------------------------------------------------

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const resource = getParam(req, 'resource');
  const sub = getParam(req, 'id'); // for resource === 'auth', this is the action

  switch (resource) {
    case 'auth':
      await handleAuth(sub, req, res);
      return;
    case 'distributors':
      await handleDistributors(sub, req, res);
      return;
    case 'clients':
      await handleClients(sub, req, res);
      return;
    case 'sales-reps':
      await handleSalesReps(sub, req, res);
      return;
    case 'performance-targets':
      await handlePerformanceTargets(sub, req, res);
      return;
    case 'commissions':
      await handleCommissions(sub, req, res);
      return;
    case 'discount-approvals':
      await handleDiscountApprovals(sub, req, res);
      return;
    case 'leads':
      await handleLeads(sub, req, res);
      return;
    case 'opportunities':
      await handleOpportunities(sub, req, res);
      return;
    case 'products':
      await handleProducts(sub, req, res);
      return;
    case 'stores':
      await handleStores(sub, req, res);
      return;
    case 'tasks':
      await handleTasks(sub, req, res);
      return;
    default:
      res.status(404).json({ success: false, error: 'Not found' });
  }
}
