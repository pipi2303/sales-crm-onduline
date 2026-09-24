// Quotations repository — same adapter pattern as leadsRepository.ts /
// contractsRepository.ts.
//
// Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup menu
// Sales Pipeline). Replaces TWO previously separate, mutually unaware,
// 100% frontend-only "quotation" features:
//   - ConfigurePriceQuote.tsx's local useState<Quote[]> (dummy seed data,
//     "Additional Discount (%)" captured but never applied to the saved
//     total).
//   - QuotationManagement.tsx's hardcoded module-level QUOTATIONS array
//     (always exactly 3 fake rows, KPI cards showing static numbers with
//     no relation to real data).
// Both now read/write the same real backend (prisma/schema.prisma's
// Quotation/QuotationItem models, GET/POST/PUT/DELETE /api/quotations).
//
// Server recomputes subtotal/totalAmount from items[] + additionalDiscountPercent
// on every create/edit (api/handler.ts's computeQuotationTotals) — this is
// what actually fixes the "additional discount never applied" bug; the
// client-sent totalAmount, if any, is ignored.

import type { Result } from '@/types/result';

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface QuotationItemInput {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface QuotationItem extends QuotationItemInput {
  id: string;
  discountPercent: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  clientId?: string | null;
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  opportunityId?: string | null;
  subtotal: number;
  additionalDiscountPercent: number;
  totalAmount: number;
  status: QuotationStatus;
  validUntil: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuotationItem[];
}

export interface QuotationInput {
  quoteNumber?: string;
  clientId?: string | null;
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  opportunityId?: string | null;
  additionalDiscountPercent?: number;
  status?: QuotationStatus;
  validUntil?: string | Date | null;
  notes?: string | null;
  items?: QuotationItemInput[];
}

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
    const body = res.status === 204 ? { success: true } : await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Sesi login tidak valid atau sudah berakhir. Silakan logout dan login kembali.' };
      }
      return { success: false, error: body.error ?? 'Terjadi kesalahan pada server' };
    }
    return body as Result<T>;
  } catch (error) {
    console.error(`quotationsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

const STATUS_OUT: Record<QuotationStatus, string> = {
  draft: 'DRAFT',
  sent: 'SENT',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  expired: 'EXPIRED',
  cancelled: 'CANCELLED',
};
const STATUS_IN: Record<string, QuotationStatus> = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

function toApiPayload(input: Partial<QuotationInput>): Record<string, unknown> {
  const { status, validUntil, items, ...rest } = input;
  const payload: Record<string, unknown> = { ...rest };
  if (status) payload.status = STATUS_OUT[status];
  if (validUntil !== undefined) {
    payload.validUntil = validUntil instanceof Date ? validUntil.toISOString() : validUntil;
  }
  if (items) payload.items = items;
  return payload;
}

function fromApiQuotation(row: any): Quotation {
  return {
    id: row.id,
    quoteNumber: row.quoteNumber,
    clientId: row.clientId ?? null,
    clientName: row.clientName,
    clientCompany: row.clientCompany ?? null,
    clientEmail: row.clientEmail ?? null,
    opportunityId: row.opportunityId ?? null,
    subtotal: Number(row.subtotal),
    additionalDiscountPercent: Number(row.additionalDiscountPercent),
    totalAmount: Number(row.totalAmount),
    status: STATUS_IN[row.status] ?? 'draft',
    validUntil: row.validUntil ? new Date(row.validUntil) : null,
    notes: row.notes ?? null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    items: (row.items ?? []).map((it: any) => ({
      id: it.id,
      productId: it.productId ?? null,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      discountPercent: Number(it.discountPercent),
      lineTotal: Number(it.lineTotal),
    })),
  };
}

export const quotationsRepository = {
  async getAll(): Promise<Result<Quotation[]>> {
    const res = await apiFetch<any[]>('/api/quotations');
    if (!res.success || !res.data) return res as Result<Quotation[]>;
    return { success: true, data: res.data.map(fromApiQuotation) };
  },

  async getById(id: string): Promise<Result<Quotation>> {
    const res = await apiFetch<any>(`/api/quotations/${id}`);
    if (!res.success || !res.data) return res as Result<Quotation>;
    return { success: true, data: fromApiQuotation(res.data) };
  },

  async create(input: QuotationInput): Promise<Result<Quotation>> {
    const res = await apiFetch<any>('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<Quotation>;
    return { success: true, data: fromApiQuotation(res.data) };
  },

  async update(id: string, updates: Partial<QuotationInput>): Promise<Result<Quotation>> {
    const res = await apiFetch<any>(`/api/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<Quotation>;
    return { success: true, data: fromApiQuotation(res.data) };
  },

  // No dedicated backend endpoint — a duplicate is just a new quotation
  // seeded from an existing one's items, reset to draft with a fresh
  // number, following the same "thin backend, smart repository" shape
  // as the rest of this file.
  async duplicate(source: Quotation): Promise<Result<Quotation>> {
    return quotationsRepository.create({
      clientId: source.clientId,
      clientName: source.clientName,
      clientCompany: source.clientCompany,
      clientEmail: source.clientEmail,
      opportunityId: source.opportunityId,
      additionalDiscountPercent: source.additionalDiscountPercent,
      status: 'draft',
      validUntil: source.validUntil,
      notes: source.notes,
      items: source.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
      })),
    });
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/quotations/${id}`, { method: 'DELETE' });
  },
};
