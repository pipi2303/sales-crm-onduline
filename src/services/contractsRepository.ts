// Contracts repository — same adapter pattern as leadsRepository.ts /
// discountApprovalsRepository.ts.
//
// Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup menu
// Sales Pipeline). Replaces src/services/api.ts's contractsApi (getAll
// only, backed by localStorage, no create/update/delete at all — every
// save in ContractFormModal actually went to a dead mock Supabase URL)
// with real calls to GET/POST/PUT/DELETE /api/contracts
// (prisma/schema.prisma's Contract model).
//
// Two shape gaps bridged here, same categories as the other repositories:
// - ContractStatus is a SCREAMING_SNAKE_CASE Prisma enum server-side, a
//   lower-case string literal client-side (STATUS_OUT/STATUS_IN) — same
//   @map() convention as everywhere else in this schema.
// - `value` is a Decimal column (serializes to JSON as a string) and
//   startDate/endDate are Date objects client-side but ISO strings over
//   the wire — converted on every read.

import type { Contract } from '@/app/data/dummyData';
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
    console.error(`contractsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

type ContractStatus = Contract['status'];

const STATUS_OUT: Record<ContractStatus, string> = {
  draft: 'DRAFT',
  pending: 'PENDING',
  active: 'ACTIVE',
  expired: 'EXPIRED',
  terminated: 'TERMINATED',
};
const STATUS_IN: Record<string, ContractStatus> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
};

// clientId/opportunityId are real FK links used for seeding/linking
// (Bab 30 task #22) but aren't part of the canonical frontend Contract
// type (src/app/data/dummyData.ts) — carried through as optional extras
// on the wire payload, same idea as EXTRA_KEYS elsewhere, just without
// a JSON `extra` column since these are real columns on Contract.
export type ContractWithLinks = Contract & { clientId?: string | null; opportunityId?: string | null };

// create()/update() accept date fields as either a Date or the raw
// yyyy-mm-dd string an <input type="date"> gives (ContractFormModal
// keeps its own formData.startDate/endDate as strings until submit) --
// toApiPayload normalizes either shape onto the wire as an ISO string.
export type ContractInput = Partial<Omit<ContractWithLinks, 'startDate' | 'endDate'>> & {
  startDate?: Date | string;
  endDate?: Date | string;
};

function toApiPayload(input: ContractInput): Record<string, unknown> {
  const { status, startDate, endDate, ...rest } = input as Record<string, unknown> & {
    status?: ContractStatus;
    startDate?: Date | string;
    endDate?: Date | string;
  };
  const payload: Record<string, unknown> = { ...rest };
  if (status) payload.status = STATUS_OUT[status];
  if (startDate) payload.startDate = startDate instanceof Date ? startDate.toISOString() : startDate;
  if (endDate) payload.endDate = endDate instanceof Date ? endDate.toISOString() : endDate;
  return payload;
}

function fromApiContract(row: any): ContractWithLinks {
  return {
    id: row.id,
    contractNumber: row.contractNumber,
    clientId: row.clientId ?? null,
    clientName: row.clientName,
    company: row.company,
    opportunityId: row.opportunityId ?? null,
    product: row.product ?? '',
    value: Number(row.value),
    startDate: new Date(row.startDate),
    endDate: new Date(row.endDate),
    status: STATUS_IN[row.status] ?? 'draft',
    signedBy: row.signedBy ?? '',
    salesPerson: row.salesPerson ?? '',
  };
}

export const contractsRepository = {
  async getAll(): Promise<Result<ContractWithLinks[]>> {
    const res = await apiFetch<any[]>('/api/contracts');
    if (!res.success || !res.data) return res as Result<ContractWithLinks[]>;
    return { success: true, data: res.data.map(fromApiContract) };
  },

  async getById(id: string): Promise<Result<ContractWithLinks>> {
    const res = await apiFetch<any>(`/api/contracts/${id}`);
    if (!res.success || !res.data) return res as Result<ContractWithLinks>;
    return { success: true, data: fromApiContract(res.data) };
  },

  async create(input: ContractInput): Promise<Result<ContractWithLinks>> {
    const res = await apiFetch<any>('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<ContractWithLinks>;
    return { success: true, data: fromApiContract(res.data) };
  },

  async update(id: string, updates: ContractInput): Promise<Result<ContractWithLinks>> {
    const res = await apiFetch<any>(`/api/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<ContractWithLinks>;
    return { success: true, data: fromApiContract(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/contracts/${id}`, { method: 'DELETE' });
  },
};
