// GET/POST/DELETE /api/leads, GET/PUT/DELETE /api/leads/:id — combined
// into one optional-catch-all route (api/leads/[[...id]].ts) so this
// resource counts as a single Vercel serverless function instead of two,
// which matters on the Hobby plan's 12-function limit. The two branches
// below are the unchanged bodies of the former api/leads/index.ts (no id)
// and api/leads/[id].ts (id present); URLs are unaffected since
// [[...id]].ts still matches both /api/leads and /api/leads/:id.
//
// Second of the three pilot modules named in Fase 1 item 2 ("mulai dari
// modul yang sudah punya pola api.ts (Lead, Opportunity, Product)").
// Unlike Product, a Lead is created and edited day-to-day by any sales
// role, not just master-data roles — so reads and creates only require
// being authenticated, and only delete is held back to manager+ (losing a
// lead record is the sensitive operation, not creating one).
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

function getId(req: ApiRequest): string | undefined {
  const raw = req.query?.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const id = getId(req);

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
