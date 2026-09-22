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
import { requireAuth, requireRole, ForbiddenError, UnauthorizedError } from '../lib/rbac.js';
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
