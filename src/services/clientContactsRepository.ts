// ClientContact repository -- Bab 16.5, Organisation Tree / Influence Map
// (24 Sep 2026). Same adapter pattern as clientsRepository.ts/
// opportunitiesRepository.ts: frontend pakai snake_case + enum
// hyphenated-lowercase (src/types/clientContact.ts), backend Prisma pakai
// camelCase + enum SCREAMING_SNAKE_CASE -- FIELD_MAP dan *_OUT/*_IN yang
// menjembatani.

import type { ClientContact, InfluenceRole, RelationshipStatus, RelationshipCloseness } from '@/types/clientContact';
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
    console.error(`clientContactsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

const INFLUENCE_ROLE_OUT: Record<InfluenceRole, string> = {
  'decision-maker': 'DECISION_MAKER',
  approver: 'APPROVER',
  influencer: 'INFLUENCER',
  'technical-advisor': 'TECHNICAL_ADVISOR',
  consultant: 'CONSULTANT',
};
const INFLUENCE_ROLE_IN: Record<string, InfluenceRole> = {
  DECISION_MAKER: 'decision-maker',
  APPROVER: 'approver',
  INFLUENCER: 'influencer',
  TECHNICAL_ADVISOR: 'technical-advisor',
  CONSULTANT: 'consultant',
};

const RELATIONSHIP_STATUS_OUT: Record<RelationshipStatus, string> = {
  positive: 'POSITIVE',
  neutral: 'NEUTRAL',
  negative: 'NEGATIVE',
};
const RELATIONSHIP_STATUS_IN: Record<string, RelationshipStatus> = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
};

const RELATIONSHIP_CLOSENESS_OUT: Record<RelationshipCloseness, string> = {
  'baru-kenal': 'BARU_KENAL',
  'kenal-baik': 'KENAL_BAIK',
  champion: 'CHAMPION',
};
const RELATIONSHIP_CLOSENESS_IN: Record<string, RelationshipCloseness> = {
  BARU_KENAL: 'baru-kenal',
  KENAL_BAIK: 'kenal-baik',
  CHAMPION: 'champion',
};

function fromApiContact(row: any): ClientContact {
  return {
    id: row.id,
    client_id: row.clientId ?? '',
    nama: row.nama ?? '',
    jabatan: row.jabatan ?? '',
    email: row.email ?? '',
    telepon: row.telepon ?? '',
    whatsapp: row.whatsapp ?? '',
    influence_role: INFLUENCE_ROLE_IN[row.influenceRole] ?? 'consultant',
    relationship_status: RELATIONSHIP_STATUS_IN[row.relationshipStatus] ?? 'neutral',
    closeness: RELATIONSHIP_CLOSENESS_IN[row.closeness] ?? 'baru-kenal',
    reports_to_id: row.reportsToId ?? '',
    notes: row.notes ?? '',
    created_by_id: row.createdById ?? '',
    created_at: row.createdAt ?? '',
    updated_at: row.updatedAt ?? '',
    // _count hanya ada di response list/get-single (lihat
    // handleClientContacts di api/handler.ts) -- fallback 0 kalau endpoint
    // lain (mis. hasil create/update) tidak menyertakannya.
    meeting_count: row._count?.activities ?? 0,
  };
}

// reportsToId adalah FK -- string kosong bukan "tidak ada", harus dikirim
// null ke API supaya tidak dianggap mencoba melapor ke id `''`.
function toApiPayload(input: Partial<ClientContact>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.client_id !== undefined) payload.clientId = input.client_id;
  if (input.nama !== undefined) payload.nama = input.nama;
  if (input.jabatan !== undefined) payload.jabatan = input.jabatan;
  if (input.email !== undefined) payload.email = input.email;
  if (input.telepon !== undefined) payload.telepon = input.telepon;
  if (input.whatsapp !== undefined) payload.whatsapp = input.whatsapp;
  if (input.influence_role !== undefined) payload.influenceRole = INFLUENCE_ROLE_OUT[input.influence_role];
  if (input.relationship_status !== undefined) payload.relationshipStatus = RELATIONSHIP_STATUS_OUT[input.relationship_status];
  if (input.closeness !== undefined) payload.closeness = RELATIONSHIP_CLOSENESS_OUT[input.closeness];
  if (input.reports_to_id !== undefined) payload.reportsToId = input.reports_to_id || null;
  if (input.notes !== undefined) payload.notes = input.notes;
  return payload;
}

export const clientContactsRepository = {
  async getByClientId(clientId: string): Promise<Result<ClientContact[]>> {
    const res = await apiFetch<any[]>(`/api/client-contacts?clientId=${encodeURIComponent(clientId)}`);
    if (!res.success || !res.data) return res as Result<ClientContact[]>;
    return { success: true, data: res.data.map(fromApiContact) };
  },

  async getById(id: string): Promise<Result<ClientContact>> {
    const res = await apiFetch<any>(`/api/client-contacts/${id}`);
    if (!res.success || !res.data) return res as Result<ClientContact>;
    return { success: true, data: fromApiContact(res.data) };
  },

  async create(
    input: Partial<ClientContact> & Pick<ClientContact, 'client_id' | 'nama' | 'influence_role'>
  ): Promise<Result<ClientContact>> {
    const res = await apiFetch<any>('/api/client-contacts', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<ClientContact>;
    return { success: true, data: fromApiContact(res.data) };
  },

  async update(id: string, updates: Partial<ClientContact>): Promise<Result<ClientContact>> {
    const res = await apiFetch<any>(`/api/client-contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<ClientContact>;
    return { success: true, data: fromApiContact(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/client-contacts/${id}`, { method: 'DELETE' });
  },
};
