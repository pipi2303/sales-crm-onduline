// Commission payout ledger repository — same adapter pattern as
// leadsRepository.ts.
//
// Fase 1 item 2 (23 Sep 2026): CommissionRecord already existed in
// prisma/schema.prisma but had no route, so this used to be
// localStorage-only. Now calls GET/POST/PUT/DELETE /api/commissions.
// Shape gaps bridged here:
// - status is a SCREAMING_SNAKE_CASE Prisma enum server-side
//   (PENDING/APPROVED/PAID), a lower-case string literal client-side.
// - baseCommission/bonuses/totalCommission are Decimal columns, which
//   serialize to JSON as strings — Number() on every read.
// - period/paymentDate are DateTime columns; period is sliced to a plain
//   'YYYY-MM-DD' string to match src/types/commission.ts.
// getForSalesRep filters client-side over the full list rather than via
// a query param, same reasoning as performanceTargetsRepository.ts.

import type { CommissionRecord, NewCommissionRecord, CommissionStatus } from '@/types/commission';
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
    const body = res.status === 204 ? { success: true } : await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Sesi login tidak valid atau sudah berakhir. Silakan logout dan login kembali.' };
      }
      return { success: false, error: body.error ?? 'Terjadi kesalahan pada server' };
    }
    return body as Result<T>;
  } catch (error) {
    console.error(`commissionsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

const STATUS_IN: Record<string, CommissionStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
};

function fromApiRecord(row: any): CommissionRecord {
  return {
    ...row,
    period: typeof row.period === 'string' ? row.period.slice(0, 10) : row.period,
    baseCommission: Number(row.baseCommission),
    bonuses: Number(row.bonuses),
    totalCommission: Number(row.totalCommission),
    status: STATUS_IN[row.status] ?? 'pending',
    paymentDate: row.paymentDate ? String(row.paymentDate).slice(0, 10) : undefined,
  } as CommissionRecord;
}

export const commissionsRepository = {
  async getAll(): Promise<Result<CommissionRecord[]>> {
    const res = await apiFetch<any[]>('/api/commissions');
    if (!res.success || !res.data) return res as Result<CommissionRecord[]>;
    return { success: true, data: res.data.map(fromApiRecord) };
  },

  async getForSalesRep(salesRepId: string): Promise<Result<CommissionRecord[]>> {
    const all = await commissionsRepository.getAll();
    if (!all.success || !all.data) return all;
    return { success: true, data: all.data.filter((r) => r.salesRepId === salesRepId) };
  },

  async create(input: NewCommissionRecord): Promise<Result<CommissionRecord>> {
    const res = await apiFetch<any>('/api/commissions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.success || !res.data) return res as Result<CommissionRecord>;
    return { success: true, data: fromApiRecord(res.data) };
  },

  async update(id: string, updates: Partial<NewCommissionRecord>): Promise<Result<CommissionRecord>> {
    const res = await apiFetch<any>(`/api/commissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.success || !res.data) return res as Result<CommissionRecord>;
    return { success: true, data: fromApiRecord(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/commissions/${id}`, { method: 'DELETE' });
  },
};
