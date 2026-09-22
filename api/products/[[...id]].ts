// GET/POST /api/products, GET/PUT/DELETE /api/products/:id — combined
// into one optional-catch-all route (api/products/[[...id]].ts) so this
// resource counts as a single Vercel serverless function instead of two,
// which matters on the Hobby plan's 12-function limit. The two branches
// below are the unchanged bodies of the former api/products/index.ts (no
// id) and api/products/[id].ts (id present); URLs are unaffected since
// [[...id]].ts still matches both /api/products and /api/products/:id.
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
