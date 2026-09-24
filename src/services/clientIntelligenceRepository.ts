// ClientIntelligence repository -- Bab 16.5, Customer Intelligence MVP
// (24 Sep 2026). Relasinya 1:1 dengan Client, jadi cuma get (by clientId)
// dan upsert (PUT) -- tidak ada create/delete terpisah, sama seperti
// backend-nya (handleClientIntelligence di api/handler.ts).

import type { ClientIntelligence } from '@/types/clientContact';
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
    console.error(`clientIntelligenceRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

function fromApiIntelligence(row: any): ClientIntelligence {
  return {
    id: row.id ?? '',
    client_id: row.clientId ?? '',
    profil_bisnis: row.profilBisnis ?? '',
    proyek_berjalan: row.proyekBerjalan ?? '',
    kompetitor_eksisting: row.kompetitorEksisting ?? '',
    sumber_informasi: row.sumberInformasi ?? '',
    catatan_tambahan: row.catatanTambahan ?? '',
    links: row.links ?? null,
    updated_by_id: row.updatedById ?? '',
    created_at: row.createdAt ?? '',
    updated_at: row.updatedAt ?? '',
  };
}

export const clientIntelligenceRepository = {
  // data: null kalau client ini belum pernah diisi intelijennya -- bukan
  // error, frontend tinggal render form kosong.
  async getByClientId(clientId: string): Promise<Result<ClientIntelligence | null>> {
    const res = await apiFetch<any>(`/api/client-intelligence/${clientId}`);
    if (!res.success) return res as Result<ClientIntelligence | null>;
    return { success: true, data: res.data ? fromApiIntelligence(res.data) : null };
  },

  async save(clientId: string, updates: Partial<ClientIntelligence>): Promise<Result<ClientIntelligence>> {
    const payload: Record<string, unknown> = {};
    if (updates.profil_bisnis !== undefined) payload.profilBisnis = updates.profil_bisnis;
    if (updates.proyek_berjalan !== undefined) payload.proyekBerjalan = updates.proyek_berjalan;
    if (updates.kompetitor_eksisting !== undefined) payload.kompetitorEksisting = updates.kompetitor_eksisting;
    if (updates.sumber_informasi !== undefined) payload.sumberInformasi = updates.sumber_informasi;
    if (updates.catatan_tambahan !== undefined) payload.catatanTambahan = updates.catatan_tambahan;
    if (updates.links !== undefined) payload.links = updates.links;

    const res = await apiFetch<any>(`/api/client-intelligence/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) return res as Result<ClientIntelligence>;
    return { success: true, data: fromApiIntelligence(res.data) };
  },
};
