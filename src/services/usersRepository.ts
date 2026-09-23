// Users repository -- same adapter pattern as salesRepsRepository.ts.
//
// Bab 10 gap #4 (23 Sep 2026): AdminSystem.tsx used to fake this entirely
// (setTimeout + a hardcoded array). Now calls GET/POST/PUT /api/users
// (prisma/schema.prisma's User model, which already existed for auth but
// had no CRUD route). Deliberately no remove() -- see api/handler.ts's
// handleUsers header comment for why there is no DELETE; update() with
// { isActive: false } is how an account gets disabled.

import type { AppUser, NewAppUser, UpdateAppUser } from '@/types/user';
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
    console.error(`usersRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

export const usersRepository = {
  async getAll(): Promise<Result<AppUser[]>> {
    return apiFetch<AppUser[]>('/api/users');
  },

  async getById(id: string): Promise<Result<AppUser>> {
    return apiFetch<AppUser>(`/api/users/${id}`);
  },

  async create(input: NewAppUser): Promise<Result<AppUser>> {
    return apiFetch<AppUser>('/api/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: string, updates: UpdateAppUser): Promise<Result<AppUser>> {
    return apiFetch<AppUser>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deactivate(id: string): Promise<Result<AppUser>> {
    return this.update(id, { isActive: false });
  },

  async activate(id: string): Promise<Result<AppUser>> {
    return this.update(id, { isActive: true });
  },
};
