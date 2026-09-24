// Territories repository — same adapter pattern as salesRepsRepository.ts.
//
// Bab-follow-up (business decision confirmed with user, 23 Sep 2026):
// TerritoryProfile (name/region/assignedTo/coverage) used to be 100%
// localStorage-backed; now calls GET/POST/PUT/DELETE /api/territories.
// leads/opportunities in every response are server-computed counts
// (Lead.territoryId/Opportunity.territoryId), never sent on create/update
// — see src/types/territory.ts's NewTerritoryProfile.
// Target/actual/forecast revenue figures are still NOT stored here —
// see performanceTargetsRepository, keyed by territoryId.

import type { TerritoryProfile, NewTerritoryProfile } from '@/types/territory';
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
    console.error(`territoriesRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

function validate(input: NewTerritoryProfile): string | null {
  if (!input.name?.trim()) return 'Nama wilayah wajib diisi';
  if (!input.region?.trim()) return 'Region wajib diisi';
  if (!input.assignedTo?.trim()) return 'Penanggung jawab wajib diisi';
  if (typeof input.coverage !== 'number' || input.coverage < 0 || input.coverage > 100) return 'Coverage harus angka 0-100';
  return null;
}

// Bab 32/33 (24 Sep 2026): update() used to call no validation at all
// (only create() did) -- a well-formed-looking PUT with a blank name or an
// out-of-range coverage sailed straight through to the server. Only checks
// fields actually present in a partial update.
function validatePartial(input: Partial<NewTerritoryProfile>): string | null {
  if (input.name !== undefined && !input.name?.trim()) return 'Nama wilayah wajib diisi';
  if (input.region !== undefined && !input.region?.trim()) return 'Region wajib diisi';
  if (input.assignedTo !== undefined && !input.assignedTo?.trim()) return 'Penanggung jawab wajib diisi';
  if (
    input.coverage !== undefined &&
    (typeof input.coverage !== 'number' || Number.isNaN(input.coverage) || input.coverage < 0 || input.coverage > 100)
  ) {
    return 'Coverage harus angka 0-100';
  }
  return null;
}

export const territoriesRepository = {
  async getAll(): Promise<Result<TerritoryProfile[]>> {
    return apiFetch<TerritoryProfile[]>('/api/territories');
  },

  async getById(id: string): Promise<Result<TerritoryProfile>> {
    return apiFetch<TerritoryProfile>(`/api/territories/${id}`);
  },

  async create(input: NewTerritoryProfile): Promise<Result<TerritoryProfile>> {
    const validationError = validate(input);
    if (validationError) return { success: false, error: validationError };

    return apiFetch<TerritoryProfile>('/api/territories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async update(id: string, updates: Partial<NewTerritoryProfile>): Promise<Result<TerritoryProfile>> {
    const validationError = validatePartial(updates);
    if (validationError) return { success: false, error: validationError };

    return apiFetch<TerritoryProfile>(`/api/territories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/territories/${id}`, { method: 'DELETE' });
  },
};
