// Performance targets repository — same adapter pattern as
// leadsRepository.ts. See src/types/performanceTarget.ts for the
// "exclusive arc" rule (exactly one of productId/salesRepId/territoryId).
//
// Fase 1 item 2 (23 Sep 2026): PerformanceTarget already existed in
// prisma/schema.prisma but had no route, so this used to be
// localStorage-only. Now calls GET/POST/PUT/DELETE /api/performance-targets.
// Two shape gaps bridged here:
// - target/actual/forecast are Decimal columns, which serialize to JSON
//   as strings — Number() on every read (same as Lead.value).
// - period is a DateTime column but the frontend type treats it as a
//   plain 'YYYY-MM-DD' string — sliced to the date portion on read.
// getForEntity filters client-side over the full list rather than via a
// query param, since no other route in this app relies on anything past
// resource/id surviving vercel.json's rewrite.

import type { PerformanceTarget, NewPerformanceTarget } from '@/types/performanceTarget';
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
    console.error(`performanceTargetsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

function entityKey(input: Pick<NewPerformanceTarget, 'productId' | 'salesRepId' | 'territoryId'>): string {
  if (input.productId) return `product:${input.productId}`;
  if (input.salesRepId) return `sales_rep:${input.salesRepId}`;
  return `territory:${input.territoryId}`;
}

// Bab 32/33 (24 Sep 2026): neither create() nor update() validated
// anything client-side -- an empty/invalid Quota Target input in
// TerritoryManagement.tsx's Edit dialog produced `NaN`, which
// JSON.stringify serializes as literal `null`, which the PUT handler then
// sent straight to Prisma against a non-nullable Decimal column, crashing
// with a generic 500. This is defense-in-depth (the form itself is now
// also guarded, see TerritoryManagement.tsx), and protects any other
// current/future caller of this repository too.
function validatePartial(input: Partial<NewPerformanceTarget>): string | null {
  if (
    input.target !== undefined &&
    (typeof input.target !== 'number' || Number.isNaN(input.target) || input.target < 0)
  ) {
    return 'Target harus angka >= 0';
  }
  if (
    input.actual !== undefined &&
    (typeof input.actual !== 'number' || Number.isNaN(input.actual) || input.actual < 0)
  ) {
    return 'Actual harus angka >= 0';
  }
  return null;
}

function fromApiTarget(row: any): PerformanceTarget {
  return {
    ...row,
    period: typeof row.period === 'string' ? row.period.slice(0, 10) : row.period,
    target: Number(row.target),
    actual: Number(row.actual),
    forecast: row.forecast !== null && row.forecast !== undefined ? Number(row.forecast) : undefined,
  } as PerformanceTarget;
}

export const performanceTargetsRepository = {
  async getAll(): Promise<Result<PerformanceTarget[]>> {
    const res = await apiFetch<any[]>('/api/performance-targets');
    if (!res.success || !res.data) return res as Result<PerformanceTarget[]>;
    return { success: true, data: res.data.map(fromApiTarget) };
  },

  async getForEntity(entity: Pick<NewPerformanceTarget, 'productId' | 'salesRepId' | 'territoryId'>): Promise<Result<PerformanceTarget[]>> {
    const all = await performanceTargetsRepository.getAll();
    if (!all.success || !all.data) return all;
    const key = entityKey(entity);
    return { success: true, data: all.data.filter((t) => entityKey(t) === key) };
  },

  async create(input: NewPerformanceTarget): Promise<Result<PerformanceTarget>> {
    const validationError = validatePartial(input);
    if (validationError) return { success: false, error: validationError };

    const res = await apiFetch<any>('/api/performance-targets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.success || !res.data) return res as Result<PerformanceTarget>;
    return { success: true, data: fromApiTarget(res.data) };
  },

  async update(id: string, updates: Partial<NewPerformanceTarget>): Promise<Result<PerformanceTarget>> {
    const validationError = validatePartial(updates);
    if (validationError) return { success: false, error: validationError };

    const res = await apiFetch<any>(`/api/performance-targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.success || !res.data) return res as Result<PerformanceTarget>;
    return { success: true, data: fromApiTarget(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/performance-targets/${id}`, { method: 'DELETE' });
  },
};
