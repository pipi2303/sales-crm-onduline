// GET/POST /api/distributors, GET/PUT/DELETE /api/distributors/:id —
// combined into one optional-catch-all route
// (api/distributors/[[...id]].ts) so this resource counts as a single
// Vercel serverless function instead of two, which matters on the Hobby
// plan's 12-function limit. The two branches below are the unchanged
// bodies of the former api/distributors/index.ts (no id) and
// api/distributors/[id].ts (id present); URLs are unaffected since
// [[...id]].ts still matches both /api/distributors and
// /api/distributors/:id.
//
// Bab 8 gap 1 ("hierarki distributor-toko belum ada") and Bab 9's
// approval workflow ("Field minimal": status, diajukan oleh, tanggal
// diajukan, disetujui/ditolak oleh, tanggal keputusan, catatan alasan —
// all already on the Distributor model).
//
// Any authenticated role can submit a new distributor for approval (the
// same "any sales role creates, manager+ decides" split used for
// api/leads); editing/deciding is restricted below.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { getUserFromToken, extractBearerToken } from '../../lib/auth.js';
import type { Role } from '@prisma/client';
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

// Candidate approver roles per Bab 9's own open question ("Sales
// Manager regional atau tim Master Data/Admin?") — both, until that's
// decided one way.
const APPROVER_ROLES: Role[] = ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN'];

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const id = getId(req);

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
      requireRole(user, APPROVER_ROLES);
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
