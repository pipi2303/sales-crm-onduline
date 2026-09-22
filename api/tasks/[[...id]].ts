// GET/POST /api/tasks, GET/PUT/POST/DELETE /api/tasks/:id — combined into
// one optional-catch-all route (api/tasks/[[...id]].ts) so this resource
// counts as a single Vercel serverless function instead of two, which
// matters on the Hobby plan's 12-function limit. The two branches below
// are the unchanged bodies of the former api/tasks/index.ts (no id) and
// api/tasks/[id].ts (id present, including its check-in POST); URLs are
// unaffected since [[...id]].ts still matches both /api/tasks and
// /api/tasks/:id.
//
// Task module, wired to a real backend for the first time (previously
// schema-only groundwork for Bab 8 gap 2's check-in feature; see the
// modeling note on the Task model in schema.prisma). Any authenticated
// role can list and create tasks, matching the same "any sales role
// creates" convention already used for api/leads and api/opportunities.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import { getUserFromToken, extractBearerToken } from '../../lib/auth.js';
import { requireAuth, requireRole, ForbiddenError, UnauthorizedError } from '../../lib/rbac.js';
import { uploadCheckInPhoto, InvalidPhotoError } from '../../lib/blob.js';

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
