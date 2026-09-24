// Leads repository — same adapter pattern as productsRepository.ts.
//
// Fase 1 item 2, Lead module. Replaces src/services/api.ts's leadsApi
// (which only ever read/wrote localStorage) with real calls to
// GET/POST/PUT/DELETE /api/leads (prisma/schema.prisma's Lead model).
//
// Two shape gaps bridged here, same categories as productsRepository.ts:
// - LeadStatus is a SCREAMING_SNAKE_CASE Prisma enum server-side, a
//   lower-case string literal client-side (STATUS_OUT/STATUS_IN).
// - `value` is a Decimal column, which serializes to JSON as a string —
//   Number() on every read.
// - createdAt/lastContact are Date objects client-side (src/types/lead.ts)
//   but ISO strings over the wire — new Date(...) on every read.
//
// One more gap specific to Lead: LeadManagement.tsx's multi-contact
// editor reads/writes `companies` (an array) and `position` (a string)
// that were never part of the canonical Lead type or the Lead table —
// only Lead.extra (a Json column, added specifically for this) has
// anywhere to put them. EXTRA_KEYS is the explicit list of such fields;
// toApiPayload/fromApiLead move them into/out of `extra` so the rest of
// this file (and the API route) never has to know their names.

import type { Lead } from '@/types/lead';
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
    console.error(`leadsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

type LeadStatus = Lead['status'];

const STATUS_OUT: Record<LeadStatus, string> = {
  new: 'NEW',
  contacted: 'CONTACTED',
  qualified: 'QUALIFIED',
  proposal: 'PROPOSAL',
  negotiation: 'NEGOTIATION',
  won: 'WON',
  lost: 'LOST',
};
const STATUS_IN: Record<string, LeadStatus> = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
};

// UI fields with no dedicated Lead column — see the file header. Kept as
// an explicit list (not "everything unrecognized") so a typo'd field
// name fails loudly by just not round-tripping, rather than silently
// being accepted as "extra".
const EXTRA_KEYS = ['companies', 'position'] as const;

type LeadWithExtra = Lead & Record<string, unknown>;

function toApiPayload(input: Partial<LeadWithExtra>): Record<string, unknown> {
  const { status, ...rest } = input as Record<string, unknown> & { status?: LeadStatus };
  const payload: Record<string, unknown> = { ...rest };
  if (status) payload.status = STATUS_OUT[status];

  const extra: Record<string, unknown> = {};
  let hasExtra = false;
  for (const key of EXTRA_KEYS) {
    if (key in payload) {
      extra[key] = payload[key];
      delete payload[key];
      hasExtra = true;
    }
  }
  if (hasExtra) payload.extra = extra;

  return payload;
}

function fromApiLead(row: any): LeadWithExtra {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email ?? '',
    phone: row.phone ?? '',
    status: STATUS_IN[row.status] ?? 'new',
    value: Number(row.value),
    source: row.source ?? '',
    assignedTo: row.assignedTo ?? '',
    notes: row.notes ?? '',
    territoryId: row.territoryId ?? null,
    createdAt: new Date(row.createdAt),
    lastContact: row.lastContact ? new Date(row.lastContact) : new Date(row.createdAt),
    ...(row.extra ?? {}),
  };
}

export const leadsRepository = {
  async getAll(): Promise<Result<LeadWithExtra[]>> {
    const res = await apiFetch<any[]>('/api/leads');
    if (!res.success || !res.data) return res as Result<LeadWithExtra[]>;
    return { success: true, data: res.data.map(fromApiLead) };
  },

  async getById(id: string): Promise<Result<LeadWithExtra>> {
    const res = await apiFetch<any>(`/api/leads/${id}`);
    if (!res.success || !res.data) return res as Result<LeadWithExtra>;
    return { success: true, data: fromApiLead(res.data) };
  },

  async create(input: Partial<LeadWithExtra>): Promise<Result<LeadWithExtra>> {
    const res = await apiFetch<any>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<LeadWithExtra>;
    return { success: true, data: fromApiLead(res.data) };
  },

  async update(id: string, updates: Partial<LeadWithExtra>): Promise<Result<LeadWithExtra>> {
    const res = await apiFetch<any>(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<LeadWithExtra>;
    return { success: true, data: fromApiLead(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/leads/${id}`, { method: 'DELETE' });
  },

  async clearAll(): Promise<Result<void>> {
    return apiFetch<void>('/api/leads', { method: 'DELETE' });
  },

  // Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup
  // menu Sales Pipeline): Lead -> Opportunity conversion. Sebelumnya
  // tidak ada implementasi sama sekali (src/services/api.ts's
  // convertLead() menunjuk ke route yang tidak pernah ada dan tidak
  // dipanggil di mana pun). Mengembalikan Opportunity yang baru dibuat
  // (bukan Lead) -- dipakai sebagai `any` di sini karena leadsRepository
  // tidak mengimpor tipe Opportunity; pemanggil (LeadManagement.tsx)
  // hanya butuh id/name-nya untuk toast konfirmasi.
  async convertToOpportunity(id: string, overrides?: { name?: string; closeDate?: string }): Promise<Result<any>> {
    return apiFetch<any>(`/api/leads/${id}`, {
      method: 'POST',
      body: JSON.stringify(overrides ?? {}),
    });
  },
};
