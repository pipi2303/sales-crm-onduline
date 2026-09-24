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
import type { Role, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
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
  // Bab 16.5 (24 Sep 2026): opsional -- lihat catatan di schema.prisma
  // OpportunityActivity.contactId.
  contactId?: string | null;
}

function getParam(req: ApiRequest, name: string): string | undefined {
  const raw = req.query?.[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

// ---------------------------------------------------------------------
// Audit log -- targeted instrumentation (business decision confirmed
// with user, 23 Sep 2026): NOT every mutation in this file writes an
// audit entry, only the ones that matter for accountability -- login/
// logout, every approve/reject (and counter-offer) decision across
// Distributor/Store/Client/Discount Approval, and user create/
// deactivate/activate. AuditLogEntry itself already existed in
// schema.prisma (Bab 10 gap analysis found it modeled but never
// written to); this is its first real writer.
//
// Deliberately fire-and-forget-safe: a failure here is logged to the
// server console and swallowed rather than thrown, so a broken audit
// write can never turn a successful business operation into a 500 the
// user sees.
// ---------------------------------------------------------------------
async function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
) {
  try {
    await prisma.auditLogEntry.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        ...(before !== undefined && { beforeJson: before as Prisma.InputJsonValue }),
        ...(after !== undefined && { afterJson: after as Prisma.InputJsonValue }),
      },
    });
  } catch (err) {
    console.error('[audit] failed to write log entry:', err);
  }
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
    await logAudit(null, 'login.failed', 'User', email.toLowerCase());
    res.status(401).json({ success: false, error: 'Email atau password salah' });
    return;
  }

  const { token, expiresAt } = await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit(user.id, 'login', 'User', user.id, undefined, { email: user.email });

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
  if (token) {
    const actor = await getUserFromToken(token);
    await revokeSession(token);
    if (actor) await logAudit(actor.id, 'logout', 'User', actor.id);
  }
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
          include: { salesRep: { select: { id: true, name: true, email: true } } },
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
        include: { stores: true, salesRep: { select: { id: true, name: true, email: true } } },
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
          // Bab 12 follow-up (insight #7): penugasan PIC sales rep, lepas
          // dari alur approve/reject -- null diperbolehkan untuk melepas
          // penugasan.
          ...(body.salesRepId !== undefined && { salesRepId: body.salesRepId as string | null }),
        },
      });
      if (isDeciding) {
        await logAudit(
          user.id,
          nextStatus === 'APPROVED' ? 'distributor.approve' : 'distributor.reject',
          'Distributor',
          id,
          { status: current.status },
          { status: nextStatus, rejectionNote: (body.rejectionNote as string) ?? null },
        );
      }
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
            territoryId: (body.territoryId as string) ?? null,
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
          ...(body.territoryId !== undefined && { territoryId: body.territoryId as string | null }),
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
// every browser had its own private, never-shared list of clients.
//
// Fase 1 item 5 (unify Client data model, 23 Sep 2026): the model's
// healthcare-shaped fields (idSatusehat/idFaskesBpjs/statusAkreditasi/
// volumePasien/jumlahTempatTidur) have been removed -- no Onduline
// equivalent, and jumlahTempatTidur was silently feeding AI lead-scoring
// math (see src/utils/clientSegmentTier.ts). npwpFaskes/sistemLama were
// kept and renamed to npwp/vendorSebelumnya -- generic business concepts,
// not healthcare-specific.
// ---------------------------------------------------------------------

function generateCustomerId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CUS-${date}-${rand}`;
}

// Bab 10 gap #1 ("Client tanpa approval workflow", 23 Sep 2026): every new
// client now starts PENDING and needs one of these roles to decide --
// same approver set as Distributor/Store (Bab 9) and Territory.
const CLIENT_APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'];

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
            npwp: (body.npwp as string) ?? null,
            vendorSebelumnya: (body.vendorSebelumnya as string) ?? null,
            salesFlow: (body.salesFlow as 'PROJECT' | 'RETAIL') ?? null,
            distributorId: (body.distributorId as string) ?? null,
            storeId: (body.storeId as string) ?? null,
            status: 'PENDING',
            submittedById: user.id,
            submittedAt: new Date(),
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
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          opportunities: true,
          // Bab 16.5 (24 Sep 2026): org tree/influence + customer
          // intelligence, dimuat sekalian di sini supaya halaman detail
          // client tidak perlu request terpisah untuk data yang selalu
          // ditampilkan bareng.
          contacts: { include: { _count: { select: { activities: true } } }, orderBy: { createdAt: 'asc' } },
          intelligence: true,
        },
      });
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
        'nomorTelepon', 'emailResmi', 'namaPic', 'jabatanPic',
        'whatsappPic', 'statusHubungan', 'paketAktif', 'modulTambahan', 'statusKontrak',
        'statusSubscription', 'tanggalMulaiLangganan', 'tanggalHabisKontrak',
        'totalNilaiKontrak', 'fileKontrakDigital', 'statusEsign', 'npwp', 'vendorSebelumnya',
        'salesFlow', 'distributorId', 'storeId',
      ] as const;

      // A status change away from PENDING is an approval decision, not a
      // profile edit -- gate it separately, same split as Distributor/Store.
      const nextStatus = body.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
      let isDeciding = false;
      if (nextStatus !== undefined) {
        const current = await prisma.client.findUnique({ where: { id } });
        if (!current) {
          res.status(404).json({ success: false, error: 'Client not found' });
          return;
        }
        isDeciding = nextStatus !== current.status && current.status === 'PENDING';
        if (isDeciding) requireRole(user, CLIENT_APPROVER_ROLES);
      }

      const data: Record<string, unknown> = {};
      for (const field of editableFields) {
        if (body[field] !== undefined) data[field] = body[field];
      }
      if (nextStatus !== undefined) data.status = nextStatus;
      if (isDeciding) {
        data.decidedById = user!.id;
        data.decidedAt = new Date();
      }
      if (body.rejectionNote !== undefined) data.rejectionNote = body.rejectionNote as string;

      const client = await prisma.client.update({ where: { id }, data });
      if (isDeciding) {
        await logAudit(
          user.id,
          nextStatus === 'APPROVED' ? 'client.approve' : 'client.reject',
          'Client',
          id,
          undefined,
          { status: nextStatus, rejectionNote: (body.rejectionNote as string) ?? null },
        );
      }
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
// /api/client-contacts, /api/client-contacts/:id
//
// Bab 16.5 (24 Sep 2026): Organisation Tree & Influence Mapping -- lihat
// catatan desain lengkap di prisma/schema.prisma dekat model
// ClientContact. List/create lewat query string ?clientId= (satu client
// sekaligus -- tidak ada kebutuhan nyata untuk daftar semua kontak lintas
// client di UI manapun).
// ---------------------------------------------------------------------

async function handleClientContacts(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
    requireAuth(user);

    if (!id) {
      const clientId = getParam(req, 'clientId');

      if (req.method === 'GET') {
        if (!clientId) {
          res.status(400).json({ success: false, error: 'clientId wajib diisi' });
          return;
        }
        const contacts = await prisma.clientContact.findMany({
          where: { clientId },
          include: { _count: { select: { activities: true } } },
          orderBy: { createdAt: 'asc' },
        });
        res.status(200).json({ success: true, data: contacts });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.clientId || !body.nama || !body.influenceRole) {
          res.status(400).json({ success: false, error: 'clientId, nama, dan influenceRole wajib diisi' });
          return;
        }
        const contact = await prisma.clientContact.create({
          data: {
            clientId: body.clientId as string,
            nama: body.nama as string,
            jabatan: (body.jabatan as string) ?? null,
            email: (body.email as string) ?? null,
            telepon: (body.telepon as string) ?? null,
            whatsapp: (body.whatsapp as string) ?? null,
            influenceRole: body.influenceRole as
              | 'DECISION_MAKER'
              | 'APPROVER'
              | 'INFLUENCER'
              | 'TECHNICAL_ADVISOR'
              | 'CONSULTANT',
            relationshipStatus: (body.relationshipStatus as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE') ?? 'NEUTRAL',
            closeness: (body.closeness as 'BARU_KENAL' | 'KENAL_BAIK' | 'CHAMPION') ?? 'BARU_KENAL',
            reportsToId: (body.reportsToId as string) ?? null,
            notes: (body.notes as string) ?? null,
            createdById: user.id,
          },
        });
        res.status(201).json({ success: true, data: contact });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/client-contacts/:id
    if (req.method === 'GET') {
      const contact = await prisma.clientContact.findUnique({
        where: { id },
        include: {
          _count: { select: { activities: true } },
          activities: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!contact) {
        res.status(404).json({ success: false, error: 'Contact not found' });
        return;
      }
      res.status(200).json({ success: true, data: contact });
      return;
    }

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (body.reportsToId !== undefined && body.reportsToId === id) {
        res.status(400).json({ success: false, error: 'Kontak tidak bisa melapor ke dirinya sendiri' });
        return;
      }
      const editableFields = [
        'nama', 'jabatan', 'email', 'telepon', 'whatsapp',
        'influenceRole', 'relationshipStatus', 'closeness', 'reportsToId', 'notes',
      ] as const;
      const data: Record<string, unknown> = {};
      for (const field of editableFields) {
        if (body[field] !== undefined) data[field] = body[field];
      }
      const contact = await prisma.clientContact.update({ where: { id }, data });
      res.status(200).json({ success: true, data: contact });
      return;
    }

    if (req.method === 'DELETE') {
      await prisma.clientContact.delete({ where: { id } });
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
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }
    console.error('[api/client-contacts] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/client-intelligence/:clientId
//
// Bab 16.5 (24 Sep 2026): Customer Intelligence MVP -- satu-satu dengan
// Client (lihat catatan desain di schema.prisma). URL-nya pakai clientId
// langsung (bukan id record intelligence-nya sendiri) karena relasinya
// 1:1 -- GET mengembalikan data: null kalau belum pernah diisi (bukan
// 404), supaya frontend bisa langsung render form kosong tanpa
// nge-handle error khusus.
// ---------------------------------------------------------------------

async function handleClientIntelligence(clientId: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
    requireAuth(user);

    if (!clientId) {
      res.status(400).json({ success: false, error: 'clientId wajib diisi di URL' });
      return;
    }

    if (req.method === 'GET') {
      const intelligence = await prisma.clientIntelligence.findUnique({ where: { clientId } });
      res.status(200).json({ success: true, data: intelligence ?? null });
      return;
    }

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const fields = {
        profilBisnis: (body.profilBisnis as string) ?? null,
        proyekBerjalan: (body.proyekBerjalan as string) ?? null,
        kompetitorEksisting: (body.kompetitorEksisting as string) ?? null,
        sumberInformasi: (body.sumberInformasi as string) ?? null,
        catatanTambahan: (body.catatanTambahan as string) ?? null,
        // `as object`, bukan Prisma.InputJsonValue -- pola yang sama
        // dipakai Opportunity.extra di atas (Prisma.InputJsonValue tidak
        // ter-export dengan benar dari client version ini, lihat 154
        // error tsc pre-existing di MEMORY.md section 26/27).
        links: body.links !== undefined ? (body.links as object) : undefined,
        updatedById: user.id,
      };
      const intelligence = await prisma.clientIntelligence.upsert({
        where: { clientId },
        create: { clientId, ...fields },
        update: fields,
      });
      res.status(200).json({ success: true, data: intelligence });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error('[api/client-intelligence] unexpected error:', err);
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
            territoryId: (body.territoryId as string) ?? null,
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
          ...(body.territoryId !== undefined && { territoryId: body.territoryId as string | null }),
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
                contactId: a.contactId ?? null,
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
          contactId: (body.contactId as string) ?? null,
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
          include: { physicalAttrs: true },
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
            stock: (body.stock as number) ?? 0,
            sold: (body.sold as number) ?? 0,
            features: (body.features as string[]) ?? [],
            ...(physicalAttrs
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
          include: { physicalAttrs: true },
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
        include: { physicalAttrs: true },
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
          // field existed may not have a physicalAttrs row yet.
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
        include: { physicalAttrs: true },
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
          include: { distributor: true, salesRep: { select: { id: true, name: true, email: true } } },
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
        include: { distributor: true, tasks: true, salesRep: { select: { id: true, name: true, email: true } } },
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
          // Bab 12 follow-up (insight #7) -- lihat komentar yang sama di
          // handleDistributors.
          ...(body.salesRepId !== undefined && { salesRepId: body.salesRepId as string | null }),
        },
      });
      if (isDeciding) {
        await logAudit(
          user.id,
          nextStatus === 'APPROVED' ? 'store.approve' : 'store.reject',
          'Store',
          id,
          { status: current.status },
          { status: nextStatus, rejectionNote: (body.rejectionNote as string) ?? null },
        );
      }
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
      await logAudit(
        user.id,
        `discount.${action}`,
        'DiscountApprovalRequest',
        id,
        { status: current.status, approvalLevel: current.approvalLevel },
        { status: request.status, approvalLevel: request.approvalLevel, comment: (body.comment as string) ?? null },
      );
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
// /api/territories, /api/territories/:id
//
// Bab-follow-up (business decision confirmed with user, 23 Sep 2026):
// territoriesRepository.ts used to be 100% localStorage -- this is its
// real-backend home. assignedTo/coverage are real columns; leads/
// opportunities are NEVER stored here, always computed via Prisma's
// relation _count against Lead.territoryId/Opportunity.territoryId (see
// the schema.prisma comment on model Territory for the full rationale).
// ---------------------------------------------------------------------

function serializeTerritory(t: {
  id: string;
  name: string;
  region: string;
  assignedTo: string | null;
  coverage: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { leads: number; opportunities: number };
}) {
  return {
    id: t.id,
    name: t.name,
    region: t.region,
    assignedTo: t.assignedTo,
    coverage: t.coverage,
    leads: t._count.leads,
    opportunities: t._count.opportunities,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

async function handleTerritories(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      requireAuth(user);

      if (req.method === 'GET') {
        const territories = await prisma.territory.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { leads: true, opportunities: true } } },
        });
        res.status(200).json({ success: true, data: territories.map(serializeTerritory) });
        return;
      }

      if (req.method === 'POST') {
        requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.name || !body.region) {
          res.status(400).json({ success: false, error: 'name dan region wajib diisi' });
          return;
        }
        const territory = await prisma.territory.create({
          data: {
            name: body.name as string,
            region: body.region as string,
            assignedTo: (body.assignedTo as string) ?? null,
            coverage: (body.coverage as number) ?? 0,
          },
          include: { _count: { select: { leads: true, opportunities: true } } },
        });
        res.status(201).json({ success: true, data: serializeTerritory(territory) });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    if (req.method === 'GET') {
      requireAuth(user);
      const territory = await prisma.territory.findUnique({
        where: { id },
        include: { _count: { select: { leads: true, opportunities: true } } },
      });
      if (!territory) {
        res.status(404).json({ success: false, error: 'Wilayah tidak ditemukan' });
        return;
      }
      res.status(200).json({ success: true, data: serializeTerritory(territory) });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const territory = await prisma.territory.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name as string }),
          ...(body.region !== undefined && { region: body.region as string }),
          ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo as string | null }),
          ...(body.coverage !== undefined && { coverage: body.coverage as number }),
        },
        include: { _count: { select: { leads: true, opportunities: true } } },
      });
      res.status(200).json({ success: true, data: serializeTerritory(territory) });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
      await prisma.territory.delete({ where: { id } });
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
      res.status(404).json({ success: false, error: 'Wilayah tidak ditemukan' });
      return;
    }
    console.error('[api/territories] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/users, /api/users/:id
//
// Bab 10 gap #4 ("AdminSystem.tsx 100% mock, tidak ada endpoint
// /api/users", 23 Sep 2026). All mutations restricted to SUPER_ADMIN --
// menuConfig.ts already gates the whole Admin System menu item to 'Super
// Admin' client-side; this is the server-side half of that same boundary
// (never trust a role the client claims -- see lib/rbac.ts's header).
//
// No self-service registration exists anywhere in this app (Fase 0
// removed Quick Login, and there is no /api/auth/register) -- this is
// the ONLY way a new account gets created, so POST takes an initial
// password directly (hashed immediately via lib/auth.ts's hashPassword,
// same as the login path) rather than an invite/email flow this app has
// no infrastructure for.
//
// Deliberately no DELETE: deactivate (PUT isActive:false) is the
// supported way to disable an account without destroying its audit
// trail -- User is referenced by AuditLogEntry.actorId, Distributor/
// Store/Client submittedBy/decidedBy, Opportunity/Task ownerId, all
// ON DELETE SET NULL, so a hard delete would silently anonymize that
// history. Deactivating also revokes every currently active session for
// that user immediately, rather than waiting for tokens to expire on
// their own (getUserFromToken already checks isActive, so this is belt-
// and-suspenders, not the only thing standing between a deactivated
// account and continued access).
// ---------------------------------------------------------------------

function serializeUser(u: {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt } = u;
  return { id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt };
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password minimal 8 karakter';
  }
  return null;
}

async function handleUsers(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      if (req.method === 'GET') {
        // Bab 12 follow-up: dibutuhkan approver non-SUPER_ADMIN (Sales
        // Manager / Master Data Admin) untuk mengisi dropdown penugasan PIC
        // sales rep di Distributor/Store -- serializeUser() sudah membuang
        // passwordHash, jadi aman diperluas ke role approval ini.
        requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']);
        const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: users.map(serializeUser) });
        return;
      }

      if (req.method === 'POST') {
        requireRole(user, ['SUPER_ADMIN']);
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.email || !body.name || !body.role || !body.password) {
          res.status(400).json({ success: false, error: 'email, name, role, dan password wajib diisi' });
          return;
        }
        const passwordError = validatePassword(body.password);
        if (passwordError) {
          res.status(400).json({ success: false, error: passwordError });
          return;
        }
        const passwordHash = await hashPassword(body.password as string);
        const created = await prisma.user.create({
          data: {
            email: (body.email as string).toLowerCase(),
            name: body.name as string,
            role: body.role as Role,
            passwordHash,
            isActive: (body.isActive as boolean) ?? true,
          },
        });
        await logAudit(user.id, 'user.create', 'User', created.id, undefined, {
          email: created.email,
          role: created.role,
        });
        res.status(201).json({ success: true, data: serializeUser(created) });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    requireRole(user, ['SUPER_ADMIN']);

    if (req.method === 'GET') {
      const found = await prisma.user.findUnique({ where: { id } });
      if (!found) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.status(200).json({ success: true, data: serializeUser(found) });
      return;
    }

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>;

      // Safety guard: a Super Admin can't deactivate their own account --
      // avoids a self-inflicted lockout with no one left to undo it.
      if (id === user.id && body.isActive === false) {
        res.status(400).json({ success: false, error: 'Tidak bisa menonaktifkan akun sendiri' });
        return;
      }

      const current = body.isActive !== undefined ? await prisma.user.findUnique({ where: { id } }) : null;
      if (body.isActive !== undefined && !current) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name as string;
      if (body.role !== undefined) data.role = body.role as Role;
      if (body.isActive !== undefined) data.isActive = body.isActive as boolean;
      if (body.password !== undefined) {
        const passwordError = validatePassword(body.password);
        if (passwordError) {
          res.status(400).json({ success: false, error: passwordError });
          return;
        }
        data.passwordHash = await hashPassword(body.password as string);
      }

      const updated = await prisma.user.update({ where: { id }, data });

      if (current?.isActive === true && updated.isActive === false) {
        await prisma.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await logAudit(user.id, 'user.deactivate', 'User', id, { isActive: true }, { isActive: false });
      } else if (current?.isActive === false && updated.isActive === true) {
        await logAudit(user.id, 'user.activate', 'User', id, { isActive: false }, { isActive: true });
      }

      res.status(200).json({ success: true, data: serializeUser(updated) });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Email sudah dipakai user lain' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    console.error('[api/users] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/audit-logs -- GET only, read-only surface over the AuditLogEntry
// rows written by logAudit() above. Restricted to Super Admin, matching
// menuConfig.ts's client-side gate on the Admin System menu item that
// AdminSystem.tsx's "Audit & Security" tab lives under.
// ---------------------------------------------------------------------

async function handleAuditLogs(req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
    requireRole(user, ['SUPER_ADMIN']);

    if (req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const entries = await prisma.auditLogEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { name: true, email: true } } },
    });
    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error('[api/audit-logs] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/ai-chat -- Bab 14 Fase C: AI Assistant SUNGGUHAN, panggilan nyata
// ke Gemini API (bukan AI_KNOWLEDGE_BASE hardcoded seperti sebelumnya di
// AIChatAssistant.tsx). Konteks bisnis (opportunity terbuka, kunjungan
// toko terlewat, produk stok menipis) diambil langsung dari Prisma dan
// disuntikkan ke system prompt, supaya model menjawab berdasarkan data
// nyata -- bukan mengarang. GEMINI_API_KEY HANYA dibaca di sini
// (server-side), tidak pernah dikirim ke client. Pakai fetch mentah ke
// REST API (bukan SDK) supaya tidak menambah dependency baru untuk satu
// endpoint ini.
//
// 23 Sep 2026: awalnya pakai Anthropic Messages API, diganti ke Gemini
// karena akun Anthropic yang dipakai belum ada credit billing-nya (dan
// key generic sempat kena error "not scoped to a workspace" sebelum
// itu) -- Gemini API punya free tier yang lebih mudah diakses. Kode
// buildAiBusinessContext() dan system prompt tidak berubah, cuma bagian
// pemanggilan API-nya.
// ---------------------------------------------------------------------

const AI_MODEL_ID = process.env.AI_MODEL_ID || 'gemini-3.8-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function buildAiBusinessContext(user: { id: string; role: Role }): Promise<string> {
  const now = new Date();
  const isRep = user.role === 'SALES_REPRESENTATIVE';

  const [openOpps, overdueVisits, lowStockProducts] = await Promise.all([
    prisma.opportunity.findMany({
      where: { status: 'OPEN', ...(isRep ? { ownerId: user.id } : {}) },
      orderBy: { closeDate: 'asc' },
      take: 15,
      select: { name: true, clientName: true, totalValue: true, stage: true, closeDate: true, ownerName: true },
    }),
    prisma.task.findMany({
      where: {
        type: 'VISIT',
        checkInAt: null,
        dueDate: { lt: now },
        ...(isRep ? { ownerId: user.id } : {}),
      },
      orderBy: { dueDate: 'asc' },
      take: 15,
      include: { store: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { stock: { lte: 10 } },
      orderBy: { stock: 'asc' },
      take: 10,
      select: { name: true, sku: true, stock: true, sold: true },
    }),
  ]);

  const lines: string[] = [];
  lines.push(`Tanggal hari ini: ${now.toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(`## Opportunity terbuka (${openOpps.length} ditampilkan, urut target close terdekat)`);
  if (openOpps.length === 0) lines.push('(tidak ada opportunity terbuka)');
  for (const o of openOpps) {
    lines.push(
      `- ${o.name} | Klien: ${o.clientName} | Nilai: Rp${Number(o.totalValue).toLocaleString('id-ID')} | Stage: ${o.stage} | Target close: ${o.closeDate.toISOString().slice(0, 10)} | Owner: ${o.ownerName}`
    );
  }
  lines.push('');
  lines.push(`## Kunjungan toko terlewat (belum check-in, sudah lewat jadwal) (${overdueVisits.length} ditampilkan)`);
  if (overdueVisits.length === 0) lines.push('(tidak ada kunjungan yang terlewat)');
  for (const t of overdueVisits) {
    lines.push(`- ${t.title} | Toko: ${t.store?.name ?? '-'} | Jadwal: ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : '-'}`);
  }
  lines.push('');
  lines.push(`## Produk stok menipis (<=10 unit) (${lowStockProducts.length} ditampilkan)`);
  if (lowStockProducts.length === 0) lines.push('(tidak ada produk dengan stok menipis)');
  for (const p of lowStockProducts) {
    lines.push(`- ${p.name} (${p.sku}) | Stok: ${p.stock} | Terjual: ${p.sold}`);
  }

  return lines.join('\n');
}

async function handleAiChat(req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
    requireAuth(user);

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    if (!GEMINI_API_KEY) {
      res.status(503).json({
        success: false,
        error: 'AI Assistant belum aktif: GEMINI_API_KEY belum di-set di environment variables.',
      });
      return;
    }

    const body = (req.body ?? {}) as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };
    const message = (body.message ?? '').trim();
    if (!message) {
      res.status(400).json({ success: false, error: 'message wajib diisi' });
      return;
    }
    // Batasi 10 giliran terakhir supaya prompt tidak membengkak tanpa batas.
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];

    const context = await buildAiBusinessContext(user);
    const systemPrompt = [
      'Kamu adalah AI Sales Assistant untuk "Sales Monitoring Pro", aplikasi CRM distributor bahan bangunan Onduline (atap, waterproofing, panel surya, dst).',
      'Jawab dalam Bahasa Indonesia, singkat dan actionable, HANYA berdasarkan data bisnis nyata di bawah ini -- jangan mengarang angka, nama, atau tanggal yang tidak ada di data ini.',
      'Kalau data yang tersedia tidak cukup untuk menjawab pertanyaan, katakan terus terang bahwa datanya belum ada, jangan menebak.',
      '',
      `User yang bertanya: ${user.name} (${user.role}).`,
      '',
      'Data bisnis terkini:',
      context,
    ].join('\n');

    // Gemini pakai role "model" untuk giliran AI (bukan "assistant" seperti
    // Anthropic), dan tiap giliran percakapan dibungkus { parts: [{ text }] }
    // bukan { content: string } polos.
    const geminiContents = [
      ...history.map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(
      `${GEMINI_API_URL}/${encodeURIComponent(AI_MODEL_ID)}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[api/ai-chat] Gemini API error:', geminiRes.status, errText);
      res.status(502).json({ success: false, error: 'AI Assistant sedang bermasalah, coba lagi sebentar lagi.' });
      return;
    }

    const data = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply = data.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string')?.text ?? '';

    res.status(200).json({ success: true, data: { reply } });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error('[api/ai-chat] unexpected error:', err);
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
    case 'territories':
      await handleTerritories(sub, req, res);
      return;
    case 'users':
      await handleUsers(sub, req, res);
      return;
    case 'audit-logs':
      await handleAuditLogs(req, res);
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
    case 'client-contacts':
      await handleClientContacts(sub, req, res);
      return;
    case 'client-intelligence':
      await handleClientIntelligence(sub, req, res);
      return;
    case 'ai-chat':
      await handleAiChat(req, res);
      return;
    default:
      res.status(404).json({ success: false, error: 'Not found' });
  }
}
