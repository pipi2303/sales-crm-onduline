// Sales reps repository — same adapter pattern as leadsRepository.ts.
//
// Fase 1 item 2 (23 Sep 2026): SalesRep already existed in
// prisma/schema.prisma (id/name/email/role — deliberately minimal, see
// src/types/salesRep.ts) but had no route, so this used to be
// localStorage-only. Now calls GET/POST/PUT/DELETE /api/sales-reps.
// No shape translation needed — the frontend SalesRep type is a 1:1
// match for the Prisma model.

import type { SalesRep, NewSalesRep } from '@/types/salesRep';
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
    console.error(`salesRepsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

export const salesRepsRepository = {
  async getAll(): Promise<Result<SalesRep[]>> {
    return apiFetch<SalesRep[]>('/api/sales-reps');
  },

  async getById(id: string): Promise<Result<SalesRep>> {
    return apiFetch<SalesRep>(`/api/sales-reps/${id}`);
  },

  async create(input: NewSalesRep): Promise<Result<SalesRep>> {
    return apiFetch<SalesRep>('/api/sales-reps', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: string, updates: Partial<NewSalesRep>): Promise<Result<SalesRep>> {
    return apiFetch<SalesRep>(`/api/sales-reps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/sales-reps/${id}`, { method: 'DELETE' });
  },
};
