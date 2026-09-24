// Employees (Karyawan / Sales Representative HR record) repository — same
// adapter pattern as territoriesRepository.ts/clientsRepository.ts.
//
// Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): replaces
// src/services/api.ts's employeesApi, which only ever read/wrote
// localStorage (USE_LOCAL_STORAGE hardcoded true, pointed at a mock
// Supabase project that was never actually reachable) -- every "Sales
// Representative" / Karyawan record, including NIK/payroll/NDA fields,
// lived in one browser and nowhere else. Now calls real
// GET/POST/PUT/DELETE /api/employees (prisma/schema.prisma's Employee
// model, api/handler.ts's handleEmployees).

import type { Karyawan } from '@/types/karyawan';
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
    console.error(`employeesRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

function validate(input: Partial<Karyawan>): string | null {
  if (!input.nama_lengkap?.trim()) return 'Nama lengkap wajib diisi';
  return null;
}

export const employeesRepository = {
  async getAll(): Promise<Result<Karyawan[]>> {
    return apiFetch<Karyawan[]>('/api/employees');
  },

  async getById(id: string): Promise<Result<Karyawan>> {
    return apiFetch<Karyawan>(`/api/employees/${id}`);
  },

  async create(input: Partial<Karyawan>): Promise<Result<Karyawan>> {
    const validationError = validate(input);
    if (validationError) return { success: false, error: validationError };
    return apiFetch<Karyawan>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: string, updates: Partial<Karyawan>): Promise<Result<Karyawan>> {
    return apiFetch<Karyawan>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/employees/${id}`, { method: 'DELETE' });
  },
};
