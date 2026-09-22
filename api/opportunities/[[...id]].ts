// GET/POST /api/opportunities, GET/PUT/POST/DELETE /api/opportunities/:id
// — combined into one optional-catch-all route
// (api/opportunities/[[...id]].ts) so this resource counts as a single
// Vercel serverless function instead of two, which matters on the Hobby
// plan's 12-function limit. The two branches below are the unchanged
// bodies of the former api/opportunities/index.ts (no id) and
// api/opportunities/[id].ts (id present, including its activity-log
// POST); URLs are unaffected since [[...id]].ts still matches both
// /api/opportunities and /api/opportunities/:id.
//
// Third of the three pilot modules named in Fase 1 item 2. Opportunity
// carries the ~40 UI-only "Overview/Commercial/Technical Detail" fields
// from src/types/opportunity.ts in a single `extra` JSON column rather
// than one column each (see the modeling note at the top of
// prisma/schema.prisma) — callers pass those under body.extra and
// everything else maps to real columns.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { getUserFromToken, extractBearerToken } from '../../lib/auth.js';
import { requireAuth, requireRole, ForbiddenError, UnauthorizedError } from '../../lib/rbac.js';

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

function getId(req: ApiRequest): string | undefined {
  const raw = req.query?.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const id = getId(req);

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
