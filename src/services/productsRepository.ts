// Products repository — adapter layer over the Product model.
//
// Fase 1 item 2: this used to read/write localStorage directly. It now
// calls the real backend (GET/POST/PUT/DELETE /api/products, prisma/
// schema.prisma's Product + ProductPhysicalAttrs).
// The point of having pulled this into its own repository earlier (see
// git history) was exactly so that this swap would only touch this file
// — every component that imports `productsRepository` keeps calling the
// same methods with the same Result<T> shape, unaffected by the swap.
//
// Shape gaps between the frontend's flat Product shape and the backend's
// Prisma-native shape, bridged here in both directions:
// - Prisma's Role/ProductStatus enums are SCREAMING_SNAKE_CASE JS-side;
//   the frontend types use lower-case string literals ('active', ...).
// - price/weightKg are Prisma `Decimal` columns, which serialize to JSON
//   as strings, not numbers — every read converts them back with Number().
// - physicalAttrs is a separate table server-side (a 1:1 extension of
//   Product) but a flat object client-side; toApiPayload nests it on the
//   way out, fromApiProduct flattens it back on the way in.
//
// History (23 Sep 2026): this file used to also branch on a `productType`
// discriminant ('software' | 'physical') with a parallel softwareAttrs
// path — that concept was removed since Onduline never sells software
// products (see src/types/product.ts's header comment for the full
// rationale). Only the physical-product path remains below.

import type { Product, NewProduct } from '@/types/product';
import type { Result } from '@/types/result';

function getAuthToken(): string | undefined {
  try {
    const raw = localStorage.getItem('salesMonitorUser');
    if (!raw) return undefined;
    return JSON.parse(raw)?.accessToken;
  } catch {
    return undefined;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<Result<T>> {
  try {
    const token = getAuthToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // No body to parse on a 204, and DELETE here always returns 200 with
    // a small JSON body, but guard anyway.
    const body = res.status === 204 ? { success: true } : await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Sesi login tidak valid atau sudah berakhir. Silakan logout dan login kembali.' };
      }
      return { success: false, error: body.error ?? 'Terjadi kesalahan pada server' };
    }
    return body as Result<T>;
  } catch (error) {
    console.error(`productsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

/** Frontend NewProduct/Product shape -> the wire shape api/products/*.ts expects. */
function toApiPayload(input: Partial<NewProduct>): Record<string, unknown> {
  const { status, ...rest } = input as Record<string, unknown> & {
    status?: 'active' | 'discontinued';
  };
  const payload: Record<string, unknown> = { ...rest };
  if (status) payload.status = status === 'active' ? 'ACTIVE' : 'DISCONTINUED';

  const p = input as Partial<Product>;
  payload.physicalAttrs = {
    unitOfMeasure: p.unitOfMeasure,
    color: p.color,
    specification: p.specification,
    weightKg: p.weightKg,
  };
  delete payload.unitOfMeasure;
  delete payload.color;
  delete payload.specification;
  delete payload.weightKg;

  return payload;
}

/** api/products/*.ts's Prisma-shaped row -> the frontend's flat Product shape. */
function fromApiProduct(row: any): Product {
  const base = {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    currency: row.currency,
    description: row.description ?? '',
    status: row.status === 'ACTIVE' ? ('active' as const) : ('discontinued' as const),
    features: row.features ?? [],
    stock: row.stock,
    sold: row.sold,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  const attrs = row.physicalAttrs ?? {};
  return {
    ...base,
    unitOfMeasure: attrs.unitOfMeasure ?? '',
    color: attrs.color ?? undefined,
    specification: attrs.specification ?? '',
    weightKg: attrs.weightKg != null ? Number(attrs.weightKg) : undefined,
  } as Product;
}

/** Runtime shape validation — TypeScript types disappear at runtime, and
 *  this app has no compiler type-checking in its build (see production
 *  readiness audit), so this is a first line of defense before the round
 *  trip to the server, which validates again (and is authoritative). */
function validate(input: NewProduct): string | null {
  if (!input.sku?.trim()) return 'SKU wajib diisi';
  if (!input.name?.trim()) return 'Nama produk wajib diisi';
  if (!input.category?.trim()) return 'Kategori wajib diisi';
  if (typeof input.price !== 'number' || input.price < 0) return 'Harga harus angka >= 0';
  if (!input.currency?.trim()) return 'Mata uang wajib diisi';
  if (input.status !== 'active' && input.status !== 'discontinued') return 'Status tidak valid';
  if (!Array.isArray(input.features)) return 'Features harus berupa array (boleh kosong)';
  if (typeof input.stock !== 'number' || input.stock < 0) return 'Stock harus angka >= 0';
  if (typeof input.sold !== 'number' || input.sold < 0) return 'Sold harus angka >= 0';
  if (!input.unitOfMeasure?.trim()) return 'Unit of measure wajib diisi';
  if (!input.specification?.trim()) return 'Spesifikasi wajib diisi';

  return null;
}

export const productsRepository = {
  async getAll(): Promise<Result<Product[]>> {
    const res = await apiFetch<any[]>('/api/products');
    if (!res.success || !res.data) return res as Result<Product[]>;
    return { success: true, data: res.data.map(fromApiProduct) };
  },

  async getById(id: string): Promise<Result<Product>> {
    const res = await apiFetch<any>(`/api/products/${id}`);
    if (!res.success || !res.data) return res as Result<Product>;
    return { success: true, data: fromApiProduct(res.data) };
  },

  async create(input: NewProduct): Promise<Result<Product>> {
    const validationError = validate(input);
    if (validationError) return { success: false, error: validationError };

    const res = await apiFetch<any>('/api/products', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<Product>;
    return { success: true, data: fromApiProduct(res.data) };
  },

  async update(id: string, updates: Partial<NewProduct>): Promise<Result<Product>> {
    const res = await apiFetch<any>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<Product>;
    return { success: true, data: fromApiProduct(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' });
  },
};
