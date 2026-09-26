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
import { randomUUID } from 'node:crypto';
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
        // Bab 30 (24 Sep 2026, hasil deep review + smoke test grup Sales
        // Pipeline): `!body.value` menolak 0 juga (falsy di JS), padahal 0
        // adalah nilai default yang sah di form ("Nilai Lead" placeholder-nya
        // literal "0" dan tidak ada tanda field ini wajib > 0) -- lead yang
        // sengaja/tidak sengaja dibiarkan di 0 selalu gagal disimpan dengan
        // pesan yang membingungkan (menyebut name/company yang sudah diisi).
        // Cek presence-nya secara eksplisit, bukan truthy-nya.
        if (!body.name || !body.company || body.value === undefined || body.value === null || body.value === '') {
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

    // GET/POST/PUT/DELETE /api/leads/:id
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

    // Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup
    // menu Sales Pipeline) -- Lead -> Opportunity conversion. Sebelumnya
    // tidak ada sama sekali: src/services/api.ts punya `convertLead()`
    // yang menunjuk ke route yang tidak pernah ada (dead code, tidak
    // dipanggil di mana pun), dan satu-satunya UI yang menyinggung
    // "Convert to Opportunity" adalah card dekoratif di DemoScheduler.tsx
    // yang tidak wired ke apa pun. POST (bukan PUT) dipakai di sini --
    // sama seperti pola "action" di handleDiscountApprovals -- karena ini
    // bukan update field Lead biasa, tapi aksi yang membuat record baru
    // (Opportunity) dan mengubah status Lead sebagai efek sampingnya.
    if (req.method === 'POST') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        res.status(404).json({ success: false, error: 'Lead not found' });
        return;
      }
      if (lead.status === 'WON') {
        res.status(400).json({ success: false, error: 'Lead ini sudah pernah dikonversi menjadi Opportunity' });
        return;
      }
      // closeDate wajib diisi di Opportunity (lihat handleOpportunities'
      // POST) tapi Lead tidak punya tanggal target close -- default 30
      // hari dari sekarang, bisa diedit user setelah konversi.
      const defaultCloseDate = new Date();
      defaultCloseDate.setDate(defaultCloseDate.getDate() + 30);

      const opportunity = await prisma.opportunity.create({
        data: {
          name: (body.name as string) || `${lead.company} - ${lead.name}`,
          leadId: lead.id,
          clientName: lead.company,
          contactPerson: lead.name,
          email: lead.email,
          phone: lead.phone,
          totalValue: Number(lead.value) || 0,
          closeDate: body.closeDate ? new Date(body.closeDate as string) : defaultCloseDate,
          stage: 'PROSPECTING',
          status: 'OPEN',
          ownerId: (body.ownerId as string) ?? user.id,
          ownerName: (body.ownerName as string) ?? user.name,
          source: lead.source,
          notes: lead.notes,
          createdBy: user.id,
        },
      });

      await prisma.lead.update({ where: { id: lead.id }, data: { status: 'WON' } });

      res.status(201).json({ success: true, data: opportunity });
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

// ---------------------------------------------------------------------
// /api/employees, /api/employees/:id
//
// Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): real backend
// for the Sales Representative / HR personnel screen -- previously
// src/services/api.ts's employeesApi, 100% localStorage (see the Employee
// model's comment in prisma/schema.prisma for the full story). Written
// with raw SQL, not a typed `prisma.employee.*` call, because the Employee
// model was added after this sandbox's Prisma Client was last generated
// and it can't be regenerated here (no network to binaries.prisma.sh).
// ---------------------------------------------------------------------

const EMPLOYEE_COLUMNS: [string, string][] = [
  ['id', 'id'],
  ['nama_lengkap', 'namaLengkap'],
  ['nik', 'nik'],
  ['tempat_lahir', 'tempatLahir'],
  ['tanggal_lahir', 'tanggalLahir'],
  ['jenis_kelamin', 'jenisKelamin'],
  ['alamat', 'alamat'],
  ['nomor_wa', 'nomorWa'],
  ['email_pribadi', 'emailPribadi'],
  ['divisi', 'divisi'],
  ['jabatan', 'jabatan'],
  ['level_jabatan', 'levelJabatan'],
  ['status_karyawan', 'statusKaryawan'],
  ['tanggal_bergabung', 'tanggalBergabung'],
  ['nama_atasan', 'namaAtasan'],
  ['npwp', 'npwp'],
  ['nomor_rekening', 'nomorRekening'],
  ['nama_bank', 'namaBank'],
  ['bpjs_ketenagakerjaan', 'bpjsKetenagakerjaan'],
  ['bpjs_kesehatan', 'bpjsKesehatan'],
  ['email_kantor', 'emailKantor'],
  ['nda_signed', 'ndaSigned'],
  ['tanggal_nda', 'tanggalNda'],
  ['level_akses', 'levelAkses'],
  ['aset_perusahaan', 'asetPerusahaan'],
  ['created_at', 'createdAt'],
  ['updated_at', 'updatedAt'],
];
const EMPLOYEE_WRITABLE_COLUMNS = EMPLOYEE_COLUMNS.filter(([col]) => !['id', 'created_at', 'updated_at'].includes(col));
const EMPLOYEE_SELECT_COLS = EMPLOYEE_COLUMNS.map(([c]) => `"${c}"`).join(', ');
// HR/PII data (NIK, payroll, NDA/access) -- restricted to the same roles
// that can delete a Client, not open to every authenticated user.
const EMPLOYEE_MANAGE_ROLES: Role[] = ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'];

function mapEmployeeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [col, camel] of EMPLOYEE_COLUMNS) out[camel] = row[col];
  return out;
}

async function handleEmployees(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
    requireAuth(user);

    if (!id) {
      if (req.method === 'GET') {
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT ${EMPLOYEE_SELECT_COLS} FROM employees ORDER BY created_at DESC`,
        );
        res.status(200).json({ success: true, data: rows.map(mapEmployeeRow) });
        return;
      }
      if (req.method === 'POST') {
        requireRole(user, EMPLOYEE_MANAGE_ROLES);
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.namaLengkap) {
          res.status(400).json({ success: false, error: 'namaLengkap wajib diisi' });
          return;
        }
        const newId = randomUUID();
        const now = new Date();
        const cols: string[] = ['id', 'created_at', 'updated_at'];
        const placeholders: string[] = ['$1', '$2', '$3'];
        const values: unknown[] = [newId, now, now];
        let i = 4;
        for (const [col, camel] of EMPLOYEE_WRITABLE_COLUMNS) {
          if (body[camel] !== undefined) {
            cols.push(col);
            placeholders.push(`$${i}`);
            values.push(body[camel]);
            i += 1;
          }
        }
        await prisma.$executeRawUnsafe(
          `INSERT INTO employees (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`,
          ...values,
        );
        await logAudit(user.id, 'employee.create', 'Employee', newId, undefined, { namaLengkap: body.namaLengkap as string });
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT ${EMPLOYEE_SELECT_COLS} FROM employees WHERE id = $1`,
          newId,
        );
        res.status(201).json({ success: true, data: mapEmployeeRow(rows[0]) });
        return;
      }
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // /api/employees/:id
    if (req.method === 'GET') {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${EMPLOYEE_SELECT_COLS} FROM employees WHERE id = $1`,
        id,
      );
      if (!rows[0]) {
        res.status(404).json({ success: false, error: 'Employee not found' });
        return;
      }
      res.status(200).json({ success: true, data: mapEmployeeRow(rows[0]) });
      return;
    }

    if (req.method === 'PUT') {
      requireRole(user, EMPLOYEE_MANAGE_ROLES);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const sets: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      for (const [col, camel] of EMPLOYEE_WRITABLE_COLUMNS) {
        if (body[camel] !== undefined) {
          sets.push(`"${col}" = $${i}`);
          values.push(body[camel]);
          i += 1;
        }
      }
      sets.push(`"updated_at" = $${i}`);
      values.push(new Date());
      i += 1;
      values.push(id);
      const affected = await prisma.$executeRawUnsafe(`UPDATE employees SET ${sets.join(', ')} WHERE id = $${i}`, ...values);
      if (affected === 0) {
        res.status(404).json({ success: false, error: 'Employee not found' });
        return;
      }
      await logAudit(user.id, 'employee.update', 'Employee', id, undefined, undefined);
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${EMPLOYEE_SELECT_COLS} FROM employees WHERE id = $1`,
        id,
      );
      res.status(200).json({ success: true, data: mapEmployeeRow(rows[0]) });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, EMPLOYEE_MANAGE_ROLES);
      const affected = await prisma.$executeRawUnsafe(`DELETE FROM employees WHERE id = $1`, id);
      if (affected === 0) {
        res.status(404).json({ success: false, error: 'Employee not found' });
        return;
      }
      await logAudit(user.id, 'employee.delete', 'Employee', id, undefined, undefined);
      res.status(200).json({ success: true });
      return;
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      res.status(err.status).json({ success: false, error: err.message });
      return;
    }
    console.error('[api/employees] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Bab 34 fix (24 Sep 2026): Client columns added after the Prisma Client in
// this sandbox was last generated (no network to binaries.prisma.sh to
// regenerate it -- see MEMORY.md) -- read/written via raw SQL instead of
// the typed `prisma.client.*` calls used for every pre-existing field.
// `npx prisma generate` picks these up onto the typed client normally once
// migrated; this raw-SQL layer can be deleted at that point.
const CLIENT_EXTRA_COLUMNS: [string, string][] = [
  ['sektor_client', 'sektorClient'],
  ['alamat_pengiriman', 'alamatPengiriman'],
  ['alamat_sama_dengan_penagihan', 'alamatSamaDenganPenagihan'],
  ['website', 'website'],
  ['discount', 'discount'],
  ['discount_status', 'discountStatus'],
  ['discount_approval_status', 'discountApprovalStatus'],
  ['discount_approval_requested_at', 'discountApprovalRequestedAt'],
  ['discount_approval_decided_by_id', 'discountApprovalDecidedById'],
  ['discount_approval_decided_at', 'discountApprovalDecidedAt'],
];

function mapClientExtraRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [col, camel] of CLIENT_EXTRA_COLUMNS) {
    const v = row[col];
    // node-postgres returns DECIMAL as a string to avoid float rounding --
    // `discount` is small (0-100ish) so a plain Number() round-trip is safe.
    out[camel] = col === 'discount' && typeof v === 'string' ? Number(v) : v;
  }
  return out;
}

async function fetchClientExtra(clientId: string): Promise<Record<string, unknown>> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${CLIENT_EXTRA_COLUMNS.map(([col]) => `"${col}"`).join(', ')} FROM clients WHERE id = $1`,
    clientId,
  );
  return rows[0] ? mapClientExtraRow(rows[0]) : {};
}

async function fetchClientsExtraMap(clientIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (clientIds.length === 0) return map;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, ${CLIENT_EXTRA_COLUMNS.map(([col]) => `"${col}"`).join(', ')} FROM clients WHERE id = ANY($1)`,
    clientIds,
  );
  for (const row of rows) map.set(row.id as string, mapClientExtraRow(row));
  return map;
}

// Whitelisted, directly PUT/POST-able extra fields. discountApprovalStatus
// and its requested/decided-by/at companions are deliberately EXCLUDED --
// those may only change via the request-discount-approval /
// decide-discount-approval actions below, so an ordinary profile-edit PUT
// can never forge its own approval.
async function applyClientExtraFields(clientId: string, body: Record<string, unknown>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const push = (col: string, val: unknown) => {
    sets.push(`"${col}" = $${i}`);
    values.push(val);
    i += 1;
  };
  if (body.sektorClient !== undefined) push('sektor_client', body.sektorClient);
  if (body.alamatPengiriman !== undefined) push('alamat_pengiriman', body.alamatPengiriman);
  if (body.alamatSamaDenganPenagihan !== undefined) push('alamat_sama_dengan_penagihan', body.alamatSamaDenganPenagihan);
  if (body.website !== undefined) push('website', body.website);
  if (body.discount !== undefined) push('discount', body.discount);
  if (body.discountStatus !== undefined) push('discount_status', body.discountStatus);
  if (sets.length === 0) return;
  values.push(clientId);
  await prisma.$executeRawUnsafe(`UPDATE clients SET ${sets.join(', ')} WHERE id = $${i}`, ...values);
}

// Server-side mirror of ClientForm.tsx's own submit guard ("Diskon di atas
// 20% memerlukan persetujuan atasan sebelum data dapat disimpan.") -- that
// check was previously ONLY client-side, so a direct API call could always
// save any discount with no approval at all.
async function validateClientDiscount(
  body: Record<string, unknown>,
  currentApprovalStatus: string | null | undefined,
): Promise<string | null> {
  if (body.discount === undefined) return null;
  const discount = Number(body.discount);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    return 'discount harus berupa angka 0-100';
  }
  const approvalStatus = (body.discountApprovalStatus as string | undefined) ?? currentApprovalStatus;
  if (discount > 20 && approvalStatus !== 'approved') {
    return 'Diskon di atas 20% memerlukan persetujuan atasan sebelum data dapat disimpan';
  }
  return null;
}

async function handleClients(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/clients
      requireAuth(user);

      if (req.method === 'GET') {
        const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
        const extraMap = await fetchClientsExtraMap(clients.map((c) => c.id));
        res.status(200).json({
          success: true,
          data: clients.map((c) => ({ ...c, ...(extraMap.get(c.id) ?? {}) })),
        });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.namaEntitas || !body.kategoriClient) {
          res.status(400).json({ success: false, error: 'namaEntitas dan kategoriClient wajib diisi' });
          return;
        }
        const discountError = await validateClientDiscount(body, null);
        if (discountError) {
          res.status(400).json({ success: false, error: discountError });
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
        await applyClientExtraFields(client.id, body);
        const extra = await fetchClientExtra(client.id);
        res.status(201).json({ success: true, data: { ...client, ...extra } });
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
          contacts: { include: { _count: { select: { activities: true, communications: true } } }, orderBy: { createdAt: 'asc' } },
          intelligence: true,
        },
      });
      if (!client) {
        res.status(404).json({ success: false, error: 'Client not found' });
        return;
      }
      const extra = await fetchClientExtra(client.id);
      res.status(200).json({ success: true, data: { ...client, ...extra } });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;

      // Bab 34 fix (24 Sep 2026): real (server-tracked) discount approval,
      // replacing ClientForm.tsx's old handleRequestApproval which was a
      // pure-frontend `setTimeout` that "approved" a >20% discount 4
      // seconds after requesting it -- no approver, human or otherwise,
      // was ever actually involved. request-discount-approval just records
      // the request (any authenticated user); decide-discount-approval
      // requires CLIENT_APPROVER_ROLES, same set that decides the client's
      // own status.
      const action = body.action as 'request-discount-approval' | 'decide-discount-approval' | undefined;
      if (action === 'request-discount-approval') {
        const current = await prisma.client.findUnique({ where: { id } });
        if (!current) {
          res.status(404).json({ success: false, error: 'Client not found' });
          return;
        }
        await prisma.$executeRawUnsafe(
          `UPDATE clients SET discount_approval_status = $1, discount_status = $2, discount_approval_requested_at = $3, discount_approval_decided_by_id = NULL, discount_approval_decided_at = NULL WHERE id = $4`,
          'pending',
          'Menunggu Persetujuan',
          new Date(),
          id,
        );
        await logAudit(user.id, 'client.discount_approval.request', 'Client', id, undefined, {
          discount: (body.discount as number | undefined) ?? null,
        });
        const extra = await fetchClientExtra(id);
        res.status(200).json({ success: true, data: { ...current, ...extra } });
        return;
      }
      if (action === 'decide-discount-approval') {
        requireRole(user, CLIENT_APPROVER_ROLES);
        const decision = body.decision as 'approved' | 'rejected' | undefined;
        if (decision !== 'approved' && decision !== 'rejected') {
          res.status(400).json({ success: false, error: 'decision harus approved atau rejected' });
          return;
        }
        const current = await prisma.client.findUnique({ where: { id } });
        if (!current) {
          res.status(404).json({ success: false, error: 'Client not found' });
          return;
        }
        await prisma.$executeRawUnsafe(
          `UPDATE clients SET discount_approval_status = $1, discount_status = $2, discount_approval_decided_by_id = $3, discount_approval_decided_at = $4 WHERE id = $5`,
          decision,
          decision === 'approved' ? 'Approved by Director' : 'Ditolak',
          user!.id,
          new Date(),
          id,
        );
        await logAudit(user.id, `client.discount_approval.${decision}`, 'Client', id, undefined, {});
        const extra = await fetchClientExtra(id);
        res.status(200).json({ success: true, data: { ...current, ...extra } });
        return;
      }

      const editableFields = [
        'namaEntitas', 'kategoriClient', 'owner', 'alamatLengkap', 'koordinatGps',
        'nomorTelepon', 'emailResmi', 'namaPic', 'jabatanPic',
        'whatsappPic', 'statusHubungan', 'paketAktif', 'modulTambahan', 'statusKontrak',
        'statusSubscription', 'tanggalMulaiLangganan', 'tanggalHabisKontrak',
        'totalNilaiKontrak', 'fileKontrakDigital', 'statusEsign', 'npwp', 'vendorSebelumnya',
        'salesFlow', 'distributorId', 'storeId',
      ] as const;

      // Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): a
      // status change is ALWAYS an approval decision, not a profile edit --
      // it used to only require CLIENT_APPROVER_ROLES when the client's
      // CURRENT status was still PENDING (`isDeciding = ... && current.status
      // === 'PENDING'`), but `data.status = nextStatus` below was applied
      // UNCONDITIONALLY whenever nextStatus was present. Once a client had
      // already been approved (or rejected) once, isDeciding went false and
      // ANY authenticated user (requireAuth only, no role check at all) could
      // flip its status again -- with no audit log either, since that was
      // also gated on isDeciding. Distributor/Store don't have this bug:
      // their whole PUT is already requireRole()'d up front, unlike
      // Client's. Fix: any actual status change requires the approver role
      // and gets audited, regardless of the client's current status.
      const nextStatus = body.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
      let isStatusChange = false;
      let previousStatus: string | undefined;
      if (nextStatus !== undefined) {
        const current = await prisma.client.findUnique({ where: { id } });
        if (!current) {
          res.status(404).json({ success: false, error: 'Client not found' });
          return;
        }
        previousStatus = current.status;
        isStatusChange = nextStatus !== current.status;
        if (isStatusChange) requireRole(user, CLIENT_APPROVER_ROLES);
      }

      if (body.discount !== undefined) {
        const existingExtra = await fetchClientExtra(id);
        const discountError = await validateClientDiscount(body, existingExtra.discountApprovalStatus as string | undefined);
        if (discountError) {
          res.status(400).json({ success: false, error: discountError });
          return;
        }
      }

      const data: Record<string, unknown> = {};
      for (const field of editableFields) {
        if (body[field] !== undefined) data[field] = body[field];
      }
      if (nextStatus !== undefined) data.status = nextStatus;
      if (isStatusChange) {
        data.decidedById = user!.id;
        data.decidedAt = new Date();
      }
      if (body.rejectionNote !== undefined) data.rejectionNote = body.rejectionNote as string;

      const client = await prisma.client.update({ where: { id }, data });
      if (isStatusChange) {
        await logAudit(
          user.id,
          nextStatus === 'APPROVED' ? 'client.approve' : nextStatus === 'REJECTED' ? 'client.reject' : 'client.status_change',
          'Client',
          id,
          { status: previousStatus },
          { status: nextStatus, rejectionNote: (body.rejectionNote as string) ?? null },
        );
      }
      await applyClientExtraFields(id, body);
      const extra = await fetchClientExtra(id);
      res.status(200).json({ success: true, data: { ...client, ...extra } });
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
          include: { _count: { select: { activities: true, communications: true } } },
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
          _count: { select: { activities: true, communications: true } },
          activities: { orderBy: { createdAt: 'desc' } },
          communications: { orderBy: { occurredAt: 'desc' } },
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
      // Bab 38 (24 Sep 2026, lanjutan review "no-gap" Bab 16.5): cek di
      // atas cuma menolak lapor ke diri sendiri secara LANGSUNG
      // (A->A), bukan siklus lebih panjang (A->B->A, atau A->B->C->A).
      // ClientOrgTreePanel.tsx's ContactNode SUDAH punya pengaman render
      // (ancestorIds) supaya siklus tidak bikin infinite loop/crash --
      // tapi efeknya kontak yang ada di siklus jadi TIDAK PERNAH jadi
      // root maupun child manapun (reportsToId-nya valid, jadi bukan
      // root; tapi rantainya melingkar, jadi tidak pernah "sampai" ke
      // root) -- hilang total dari tampilan tanpa pesan error apa pun.
      // Ditutup di sini: telusuri rantai reportsToId dari calon atasan
      // baru ke atas, tolak kalau ketemu id kontak ini sendiri di
      // tengah jalan. Dibatasi 200 langkah supaya data lama yang
      // (secara teori) sudah punya siklus tidak bikin loop tak
      // berujung di sini juga.
      if (body.reportsToId !== undefined && body.reportsToId !== null) {
        let cursor: string | null = body.reportsToId as string;
        let hops = 0;
        while (cursor && hops < 200) {
          if (cursor === id) {
            res.status(400).json({ success: false, error: 'Tidak bisa menyimpan: perubahan ini akan membuat siklus pelaporan (A melapor ke B yang (tidak langsung) melapor balik ke A)' });
            return;
          }
          const parent: { reportsToId: string | null } | null = await prisma.clientContact.findUnique({
            where: { id: cursor },
            select: { reportsToId: true },
          });
          cursor = parent?.reportsToId ?? null;
          hops += 1;
        }
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
// /api/client-communications, /api/client-communications/:id
//
// Bab 16.5 lanjutan (24 Sep 2026): menggantikan tab "Komunikasi" yang
// sebelumnya cuma useState lokal frontend (tidak pernah tersimpan). Lihat
// catatan desain lengkap di schema.prisma dekat model
// ClientCommunication untuk kenapa ini SENGAJA terpisah dari
// OpportunityActivity -- di sini TIDAK ADA kewajiban punya Opportunity
// sama sekali, cukup clientId.
// ---------------------------------------------------------------------

const COMMUNICATION_TYPES = ['TELEPON', 'EMAIL', 'MEETING', 'WHATSAPP', 'VISIT'] as const;

async function handleClientCommunications(id: string | undefined, req: ApiRequest, res: ApiResponse) {
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
        const communications = await prisma.clientCommunication.findMany({
          where: { clientId },
          orderBy: { occurredAt: 'desc' },
        });
        res.status(200).json({ success: true, data: communications });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.clientId || !body.type || !body.title || !body.description || !body.occurredAt) {
          res.status(400).json({
            success: false,
            error: 'clientId, type, title, description, dan occurredAt wajib diisi',
          });
          return;
        }
        if (!COMMUNICATION_TYPES.includes(body.type as (typeof COMMUNICATION_TYPES)[number])) {
          res.status(400).json({ success: false, error: `type tidak valid: ${body.type}` });
          return;
        }
        const communication = await prisma.clientCommunication.create({
          data: {
            clientId: body.clientId as string,
            type: body.type as (typeof COMMUNICATION_TYPES)[number],
            title: body.title as string,
            description: body.description as string,
            categories: body.categories !== undefined ? (body.categories as object) : undefined,
            contactId: (body.contactId as string) ?? null,
            occurredAt: new Date(body.occurredAt as string),
            createdById: user!.id,
          },
        });
        res.status(201).json({ success: true, data: communication });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/client-communications/:id
    if (req.method === 'GET') {
      const communication = await prisma.clientCommunication.findUnique({ where: { id } });
      if (!communication) {
        res.status(404).json({ success: false, error: 'Communication not found' });
        return;
      }
      res.status(200).json({ success: true, data: communication });
      return;
    }

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (body.type !== undefined && !COMMUNICATION_TYPES.includes(body.type as (typeof COMMUNICATION_TYPES)[number])) {
        res.status(400).json({ success: false, error: `type tidak valid: ${body.type}` });
        return;
      }
      const data: Record<string, unknown> = {};
      if (body.type !== undefined) data.type = body.type;
      if (body.title !== undefined) data.title = body.title;
      if (body.description !== undefined) data.description = body.description;
      if (body.categories !== undefined) data.categories = body.categories;
      if (body.contactId !== undefined) data.contactId = body.contactId;
      if (body.occurredAt !== undefined) data.occurredAt = new Date(body.occurredAt as string);
      const communication = await prisma.clientCommunication.update({ where: { id }, data });
      res.status(200).json({ success: true, data: communication });
      return;
    }

    if (req.method === 'DELETE') {
      await prisma.clientCommunication.delete({ where: { id } });
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
      res.status(404).json({ success: false, error: 'Communication not found' });
      return;
    }
    console.error('[api/client-communications] unexpected error:', err);
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
      // Bab 32/33 (24 Sep 2026): PUT had no validation at all (only POST's
      // validatePerformanceTargetBody did) -- an empty/invalid Quota Target
      // input client-side becomes NaN, which JSON.stringify serializes as
      // literal `null` (not dropped, unlike `undefined`), which then hit
      // Prisma's non-nullable `target`/`actual` Decimal columns as an
      // explicit null and crashed with a generic 500 instead of a clear 400.
      if (body.target !== undefined && (typeof body.target !== 'number' || Number.isNaN(body.target) || body.target < 0)) {
        res.status(400).json({ success: false, error: 'Target harus angka >= 0' });
        return;
      }
      if (body.actual !== undefined && (typeof body.actual !== 'number' || Number.isNaN(body.actual) || body.actual < 0)) {
        res.status(400).json({ success: false, error: 'Actual harus angka >= 0' });
        return;
      }
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
        // Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): this
        // used to return every sales rep's commission records to any
        // authenticated user -- no role or ownership filter at all, so a
        // Sales Executive could see everyone else's payout figures.
        // Managers/admins still see everything; a rep-level user sees only
        // the record(s) tied to the SalesRep whose email matches their own
        // (SalesRep has no direct userId FK -- email is the same
        // correlation key already used to link a User to a Distributor/
        // Store salesRepId elsewhere in this codebase).
        const MANAGE_ALL_ROLES: Role[] = ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'];
        let records;
        if (MANAGE_ALL_ROLES.includes(user.role)) {
          records = await prisma.commissionRecord.findMany({ orderBy: { period: 'desc' } });
        } else {
          const ownRep = await prisma.salesRep.findUnique({ where: { email: user.email } });
          records = ownRep
            ? await prisma.commissionRecord.findMany({ where: { salesRepId: ownRep.id }, orderBy: { period: 'desc' } })
            : [];
        }
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

      // Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): there
      // used to be ZERO status-transition validation here -- the frontend
      // (CommissionCalculator.tsx's "Konfirmasi Pembayaran") was the only
      // thing stopping a PENDING record from jumping straight to PAID,
      // and a direct API call bypassed that entirely. Only forward
      // transitions are allowed (PENDING -> APPROVED -> PAID); sending the
      // same status back (e.g. re-saving other fields) is a no-op, not an
      // error.
      if (body.status !== undefined) {
        const nextStatus = (body.status as string).toUpperCase() as 'PENDING' | 'APPROVED' | 'PAID';
        const current = await prisma.commissionRecord.findUnique({ where: { id } });
        if (!current) {
          res.status(404).json({ success: false, error: 'Commission record not found' });
          return;
        }
        const ORDER: Record<string, number> = { PENDING: 0, APPROVED: 1, PAID: 2 };
        if (nextStatus !== current.status && ORDER[nextStatus] !== ORDER[current.status] + 1) {
          res.status(400).json({
            success: false,
            error: `Tidak bisa mengubah status dari ${current.status} langsung ke ${nextStatus} -- harus berurutan PENDING -> APPROVED -> PAID`,
          });
          return;
        }
      }

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
          ...(body.closeReason !== undefined && { closeReason: body.closeReason as string | null }),
          ...(body.closeDetail !== undefined && { closeDetail: body.closeDetail as string | null }),
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

        // Bab 32/33 (24 Sep 2026, deep review + smoke test grup Produk &
        // Wilayah): sebelumnya tidak ada validasi runtime sama sekali di
        // sini -- request langsung (Postman dsb) yang melewati validate()
        // client-side (productsRepository.ts) bisa menyimpan harga/stock
        // negatif, dan field wajib yang hilang (mis. sku) baru ketahuan
        // lewat error Prisma generik yang jatuh ke catch -> 500, bukan 400
        // yang jelas.
        if (!body.sku || !body.name || !body.category || typeof body.price !== 'number') {
          res.status(400).json({ success: false, error: 'SKU, nama, kategori, dan harga (angka) wajib diisi' });
          return;
        }
        if ((body.price as number) < 0) {
          res.status(400).json({ success: false, error: 'Harga harus angka >= 0' });
          return;
        }
        if (body.stock !== undefined && (typeof body.stock !== 'number' || body.stock < 0)) {
          res.status(400).json({ success: false, error: 'Stock harus angka >= 0' });
          return;
        }
        if (body.sold !== undefined && (typeof body.sold !== 'number' || body.sold < 0)) {
          res.status(400).json({ success: false, error: 'Sold harus angka >= 0' });
          return;
        }

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

      // Bab 32/33: same bounds guard as POST, applied only to fields
      // actually present in this partial update.
      if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
        res.status(400).json({ success: false, error: 'Harga harus angka >= 0' });
        return;
      }
      if (body.stock !== undefined && (typeof body.stock !== 'number' || body.stock < 0)) {
        res.status(400).json({ success: false, error: 'Stock harus angka >= 0' });
        return;
      }
      if (body.sold !== undefined && (typeof body.sold !== 'number' || body.sold < 0)) {
        res.status(400).json({ success: false, error: 'Sold harus angka >= 0' });
        return;
      }

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
        // Bab 30 follow-up (24 Sep 2026, hasil deep review + smoke test grup
        // Sales Pipeline): sebelumnya tidak ada validasi rentang sama sekali
        // -- discountPercent negatif lolos sebagai "diskon" level 1 (auto
        // self-approved, padahal itu justru kenaikan harga), dan NaN/Infinity
        // (dari body.discountPercent yang bukan angka) bikin kolom Decimal di
        // Postgres menolak insert dengan 500 yang membingungkan.
        if (!Number.isFinite(originalPrice) || originalPrice < 0) {
          res.status(400).json({ success: false, error: 'originalPrice harus berupa angka >= 0' });
          return;
        }
        if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
          res.status(400).json({ success: false, error: 'discountPercent harus berupa angka antara 0 dan 100' });
          return;
        }
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
              action: 'APPROVED' as const,
              decidedAt: new Date(),
              comment: 'Self-approval sesuai kewenangan (diskon <= 10%)',
            };
          }
          return {
            level: stepLevel,
            approverName: '',
            approverRole: discountLevelLabel(stepLevel),
            action: 'PENDING' as const,
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
            status: selfApproved ? 'APPROVED' : 'PENDING',
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
      if (current.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          error: `Pengajuan sudah berstatus ${current.status}, tidak bisa diputuskan lagi`,
        });
        return;
      }
      const pendingStep = current.steps.find((s) => s.level === current.approvalLevel && s.action === 'PENDING');
      if (!pendingStep) {
        res.status(400).json({ success: false, error: 'Tidak ada level yang sedang menunggu approval' });
        return;
      }

      const stepAction = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'COUNTER_OFFER';
      const maxLevel = Math.max(...current.steps.map((s) => s.level));
      const isLastLevel = current.approvalLevel >= maxLevel;

      const request = await prisma.discountApprovalRequest.update({
        where: { id },
        data: {
          status:
            action === 'reject'
              ? 'REJECTED'
              : action === 'counter-offer'
              ? 'COUNTER_OFFER'
              : isLastLevel
              ? 'APPROVED'
              : 'PENDING',
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
        // Bab 32/33 (24 Sep 2026): coverage was never bounds-checked here
        // (only the client-side validate() in territoriesRepository.ts
        // enforced 0-100, and only on create) -- a direct API call could
        // store any value, and an empty/NaN coverage from the Edit dialog
        // (see PUT below) crashed with a generic 500 instead of a clear 400.
        if (
          body.coverage !== undefined &&
          (typeof body.coverage !== 'number' || Number.isNaN(body.coverage) || body.coverage < 0 || body.coverage > 100)
        ) {
          res.status(400).json({ success: false, error: 'Coverage harus angka 0-100' });
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
      if (
        body.coverage !== undefined &&
        (typeof body.coverage !== 'number' || Number.isNaN(body.coverage) || body.coverage < 0 || body.coverage > 100)
      ) {
        res.status(400).json({ success: false, error: 'Coverage harus angka 0-100' });
        return;
      }
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

// ---------------------------------------------------------------------
// /api/contracts, /api/contracts/:id
//
// Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup menu
// Sales Pipeline) -- lihat catatan desain lengkap di prisma/schema.prisma
// dekat model Contract. Menggantikan contractsApi (src/services/api.ts,
// cuma baca localStorage, tidak punya method create/update/delete sama
// sekali) dan ContractFormModal yang selama ini submit ke URL
// mock-project-id.supabase.co yang jelas-jelas tidak pernah dijawab.
async function handleContracts(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/contracts
      requireAuth(user);

      if (req.method === 'GET') {
        const contracts = await prisma.contract.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: contracts });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.contractNumber || !body.clientName || !body.company || !body.startDate || !body.endDate) {
          res.status(400).json({
            success: false,
            error: 'contractNumber, clientName, company, startDate, dan endDate wajib diisi',
          });
          return;
        }
        const value = Number(body.value);
        if (!Number.isFinite(value) || value < 0) {
          res.status(400).json({ success: false, error: 'value harus berupa angka >= 0' });
          return;
        }
        const contract = await prisma.contract.create({
          data: {
            contractNumber: body.contractNumber as string,
            clientId: (body.clientId as string) ?? null,
            clientName: body.clientName as string,
            company: body.company as string,
            opportunityId: (body.opportunityId as string) ?? null,
            product: (body.product as string) ?? '',
            value,
            startDate: new Date(body.startDate as string),
            endDate: new Date(body.endDate as string),
            status: (body.status as 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED') ?? 'DRAFT',
            signedBy: (body.signedBy as string) ?? '',
            salesPerson: (body.salesPerson as string) ?? user.name,
          },
        });
        res.status(201).json({ success: true, data: contract });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/contracts/:id
    if (req.method === 'GET') {
      requireAuth(user);
      const contract = await prisma.contract.findUnique({ where: { id } });
      if (!contract) {
        res.status(404).json({ success: false, error: 'Contract not found' });
        return;
      }
      res.status(200).json({ success: true, data: contract });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const contract = await prisma.contract.update({
        where: { id },
        data: {
          ...(body.contractNumber !== undefined && { contractNumber: body.contractNumber as string }),
          ...(body.clientId !== undefined && { clientId: body.clientId as string | null }),
          ...(body.clientName !== undefined && { clientName: body.clientName as string }),
          ...(body.company !== undefined && { company: body.company as string }),
          ...(body.opportunityId !== undefined && { opportunityId: body.opportunityId as string | null }),
          ...(body.product !== undefined && { product: body.product as string }),
          ...(body.value !== undefined && { value: Number(body.value) }),
          ...(body.startDate !== undefined && { startDate: new Date(body.startDate as string) }),
          ...(body.endDate !== undefined && { endDate: new Date(body.endDate as string) }),
          ...(body.status !== undefined && {
            status: body.status as 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED',
          }),
          ...(body.signedBy !== undefined && { signedBy: body.signedBy as string }),
          ...(body.salesPerson !== undefined && { salesPerson: body.salesPerson as string }),
        },
      });
      res.status(200).json({ success: true, data: contract });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.contract.delete({ where: { id } });
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
      res.status(404).json({ success: false, error: 'Contract not found' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Nomor kontrak sudah digunakan' });
      return;
    }
    console.error('[api/contracts] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------
// /api/quotations, /api/quotations/:id
//
// Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup menu
// Sales Pipeline) -- lihat catatan desain lengkap di prisma/schema.prisma
// dekat model Quotation/QuotationItem. Menggantikan DUA fitur frontend-
// only yang tidak sadar satu sama lain (ConfigurePriceQuote.tsx's
// useState<Quote[]> dan QuotationManagement.tsx's hardcoded QUOTATIONS
// array) dengan satu backend sungguhan.
//
// subtotal/totalAmount SENGAJA dihitung ulang di server dari items[],
// tidak dipercaya dari body -- ini yang memperbaiki bug "Additional
// Discount (%)" di ConfigurePriceQuote.tsx yang selama ini di-capture
// tapi tidak pernah benar-benar mengurangi totalAmount yang disimpan.
function computeQuotationTotals(
  items: Array<{ quantity: number; unitPrice: number; discountPercent: number }>,
  additionalDiscountPercent: number,
) {
  const subtotal = items.reduce((sum, item) => {
    const lineGross = item.quantity * item.unitPrice;
    const lineDiscount = (lineGross * item.discountPercent) / 100;
    return sum + (lineGross - lineDiscount);
  }, 0);
  const totalAmount = subtotal - (subtotal * additionalDiscountPercent) / 100;
  return { subtotal, totalAmount };
}

async function handleQuotations(id: string | undefined, req: ApiRequest, res: ApiResponse) {
  try {
    const user = await getUserFromToken(extractBearerToken(req.headers.authorization));

    if (!id) {
      // GET/POST /api/quotations
      requireAuth(user);

      if (req.method === 'GET') {
        const quotations = await prisma.quotation.findMany({
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: quotations });
        return;
      }

      if (req.method === 'POST') {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (!body.clientName) {
          res.status(400).json({ success: false, error: 'clientName wajib diisi' });
          return;
        }
        const rawItems = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
        const items = rawItems.map((it) => ({
          productId: (it.productId as string) ?? null,
          productName: (it.productName as string) ?? '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discountPercent: Number(it.discountPercent) || 0,
        }));
        const additionalDiscountPercent = Number(body.additionalDiscountPercent) || 0;
        if (additionalDiscountPercent < 0 || additionalDiscountPercent > 100) {
          res.status(400).json({ success: false, error: 'additionalDiscountPercent harus antara 0 dan 100' });
          return;
        }
        const { subtotal, totalAmount } = computeQuotationTotals(items, additionalDiscountPercent);

        const quotation = await prisma.quotation.create({
          data: {
            quoteNumber: (body.quoteNumber as string) || `QTN-${Date.now()}`,
            clientId: (body.clientId as string) ?? null,
            clientName: body.clientName as string,
            clientCompany: (body.clientCompany as string) ?? null,
            clientEmail: (body.clientEmail as string) ?? null,
            opportunityId: (body.opportunityId as string) ?? null,
            subtotal,
            additionalDiscountPercent,
            totalAmount,
            status: (body.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED') ?? 'DRAFT',
            validUntil: body.validUntil ? new Date(body.validUntil as string) : null,
            notes: (body.notes as string) ?? null,
            createdById: user.id,
            items: {
              create: items.map((it) => ({
                productId: it.productId,
                productName: it.productName,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discountPercent: it.discountPercent,
                lineTotal: it.quantity * it.unitPrice - (it.quantity * it.unitPrice * it.discountPercent) / 100,
              })),
            },
          },
          include: { items: true },
        });
        res.status(201).json({ success: true, data: quotation });
        return;
      }

      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // GET/PUT/DELETE /api/quotations/:id
    if (req.method === 'GET') {
      requireAuth(user);
      const quotation = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
      if (!quotation) {
        res.status(404).json({ success: false, error: 'Quotation not found' });
        return;
      }
      res.status(200).json({ success: true, data: quotation });
      return;
    }

    if (req.method === 'PUT') {
      requireAuth(user);
      const body = (req.body ?? {}) as Record<string, unknown>;

      // Editing items/discount recomputes subtotal+totalAmount server-side
      // (same reasoning as POST); a pure status change (Send/Cancel/
      // Approve/Reject from QuotationManagement.tsx) sends neither and
      // just updates status, leaving totals untouched.
      let totals: { subtotal: number; totalAmount: number; additionalDiscountPercent: number } | undefined;
      if (body.items !== undefined || body.additionalDiscountPercent !== undefined) {
        const current = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
        if (!current) {
          res.status(404).json({ success: false, error: 'Quotation not found' });
          return;
        }
        const rawItems = Array.isArray(body.items)
          ? (body.items as Record<string, unknown>[])
          : current.items.map((it: { productId: string | null; productName: string; quantity: number; unitPrice: unknown; discountPercent: unknown }) => ({
              productId: it.productId,
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              discountPercent: Number(it.discountPercent),
            }));
        const items = rawItems.map((it: Record<string, unknown>) => ({
          productId: (it.productId as string) ?? null,
          productName: (it.productName as string) ?? '',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discountPercent: Number(it.discountPercent) || 0,
        }));
        const additionalDiscountPercent =
          body.additionalDiscountPercent !== undefined
            ? Number(body.additionalDiscountPercent)
            : Number(current.additionalDiscountPercent);
        const computed = computeQuotationTotals(items, additionalDiscountPercent);
        totals = { ...computed, additionalDiscountPercent };

        if (body.items !== undefined) {
          await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
          await prisma.quotationItem.createMany({
            data: items.map((it: { productId: string | null; productName: string; quantity: number; unitPrice: number; discountPercent: number }) => ({
              quotationId: id,
              productId: it.productId,
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discountPercent: it.discountPercent,
              lineTotal: it.quantity * it.unitPrice - (it.quantity * it.unitPrice * it.discountPercent) / 100,
            })),
          });
        }
      }

      const quotation = await prisma.quotation.update({
        where: { id },
        data: {
          ...(body.quoteNumber !== undefined && { quoteNumber: body.quoteNumber as string }),
          ...(body.clientId !== undefined && { clientId: body.clientId as string | null }),
          ...(body.clientName !== undefined && { clientName: body.clientName as string }),
          ...(body.clientCompany !== undefined && { clientCompany: body.clientCompany as string | null }),
          ...(body.clientEmail !== undefined && { clientEmail: body.clientEmail as string | null }),
          ...(body.opportunityId !== undefined && { opportunityId: body.opportunityId as string | null }),
          ...(body.status !== undefined && {
            status: body.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED',
          }),
          ...(body.validUntil !== undefined && {
            validUntil: body.validUntil ? new Date(body.validUntil as string) : null,
          }),
          ...(body.notes !== undefined && { notes: body.notes as string | null }),
          ...(totals !== undefined && {
            subtotal: totals.subtotal,
            additionalDiscountPercent: totals.additionalDiscountPercent,
            totalAmount: totals.totalAmount,
          }),
        },
        include: { items: true },
      });
      res.status(200).json({ success: true, data: quotation });
      return;
    }

    if (req.method === 'DELETE') {
      requireRole(user, ['SUPER_ADMIN', 'SALES_MANAGER']);
      await prisma.quotation.delete({ where: { id } });
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
      res.status(404).json({ success: false, error: 'Quotation not found' });
      return;
    }
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, error: 'Nomor quotation sudah digunakan' });
      return;
    }
    console.error('[api/quotations] unexpected error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // Bab 51 (26 Sep 2026): ditemukan lewat Vercel request logs -- SEMUA
  // GET /api/* (quotations, contracts, opportunities, tasks, dst)
  // mengembalikan 304 Not Modified, bukan 200, meskipun datanya di
  // database sudah berubah (root cause laporan user "semua menu masih
  // kosong padahal sudah Load Dummy Data & tidak ada error"). Tanpa
  // Cache-Control eksplisit di sini, platform/browser boleh melakukan
  // conditional-GET caching (If-None-Match/If-Modified-Since) terhadap
  // response API yang sifatnya dinamis -- begitu ETag pertama kali
  // ter-cache (mis. saat database masih kosong), request berikutnya
  // dari browser yang sama terus menerus mendapat 304 + body kosong
  // dari cache lama, walau data sungguhan sudah bertambah. Endpoint API
  // di aplikasi ini semuanya dinamis (baca langsung dari Postgres tiap
  // request), jadi tidak pernah aman untuk di-cache atau di-conditional-
  // GET oleh browser/CDN mana pun -- no-store mencegah ini terjadi lagi
  // untuk SEMUA resource sekaligus (satu titik, bukan per-handler).
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

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
    case 'employees':
      await handleEmployees(sub, req, res);
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
    case 'contracts':
      await handleContracts(sub, req, res);
      return;
    case 'quotations':
      await handleQuotations(sub, req, res);
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
    case 'client-communications':
      await handleClientCommunications(sub, req, res);
      return;
    case 'ai-chat':
      await handleAiChat(req, res);
      return;
    default:
      res.status(404).json({ success: false, error: 'Not found' });
  }
}
