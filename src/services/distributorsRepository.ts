// Distributors repository — same adapter pattern as leadsRepository.ts /
// productsRepository.ts, for Bab 8 gap 1 / Bab 9 (prisma/schema.prisma's
// Distributor model, api/distributors/*.ts).
//
// One shape gap bridged here: ApprovalStatus is a SCREAMING_SNAKE_CASE
// Prisma enum server-side ('PENDING'/'APPROVED'/'REJECTED'), a lower-case
// string literal client-side (STATUS_OUT/STATUS_IN) — same convention as
// LeadStatus in leadsRepository.ts. submittedAt/decidedAt/createdAt/
// updatedAt are Date objects client-side, ISO strings over the wire.
//
// Note (api/distributors/[id].ts): PUT is restricted server-side to
// approver roles (Super Admin / Sales Manager / Master Data Admin) —
// update()/decide() here will get a 403 from a non-approver, same as any
// other repository call against a role-gated route.

import type { Distributor, ApprovalStatus } from '@/types/distributor';
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
    console.error(`distributorsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

const STATUS_OUT: Record<ApprovalStatus, string> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};
const STATUS_IN: Record<string, ApprovalStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function toApiPayload(input: Partial<Distributor>): Record<string, unknown> {
  const { status, ...rest } = input as Record<string, unknown> & { status?: ApprovalStatus };
  const payload: Record<string, unknown> = { ...rest };
  if (status) payload.status = STATUS_OUT[status];
  return payload;
}

function fromApiDistributor(row: any): Distributor {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address ?? '',
    gpsLat: row.gpsLat ?? null,
    gpsLng: row.gpsLng ?? null,
    status: STATUS_IN[row.status] ?? 'pending',
    submittedById: row.submittedById ?? null,
    submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
    decidedById: row.decidedById ?? null,
    decidedAt: row.decidedAt ? new Date(row.decidedAt) : null,
    rejectionNote: row.rejectionNote ?? '',
    salesRepId: row.salesRepId ?? null,
    salesRep: row.salesRep
      ? { id: row.salesRep.id, name: row.salesRep.name, email: row.salesRep.email }
      : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const distributorsRepository = {
  async getAll(): Promise<Result<Distributor[]>> {
    const res = await apiFetch<any[]>('/api/distributors');
    if (!res.success || !res.data) return res as Result<Distributor[]>;
    return { success: true, data: res.data.map(fromApiDistributor) };
  },

  async getById(id: string): Promise<Result<Distributor>> {
    const res = await apiFetch<any>(`/api/distributors/${id}`);
    if (!res.success || !res.data) return res as Result<Distributor>;
    return { success: true, data: fromApiDistributor(res.data) };
  },

  async create(input: Partial<Distributor>): Promise<Result<Distributor>> {
    const res = await apiFetch<any>('/api/distributors', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<Distributor>;
    return { success: true, data: fromApiDistributor(res.data) };
  },

  async update(id: string, updates: Partial<Distributor>): Promise<Result<Distributor>> {
    const res = await apiFetch<any>(`/api/distributors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<Distributor>;
    return { success: true, data: fromApiDistributor(res.data) };
  },

  async decide(id: string, status: 'approved' | 'rejected', rejectionNote?: string): Promise<Result<Distributor>> {
    return this.update(id, { status, ...(rejectionNote ? { rejectionNote } : {}) });
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/distributors/${id}`, { method: 'DELETE' });
  },
};
