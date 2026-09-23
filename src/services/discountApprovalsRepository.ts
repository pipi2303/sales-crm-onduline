// Discount approval workflow repository -- same adapter pattern as
// commissionsRepository.ts. See src/types/discountApproval.ts and
// api/handler.ts's handleDiscountApprovals for the full Bab 10 gap #3
// writeup.
//
// Shape gaps bridged here:
// - originalPrice/discountPercent/discountAmount/finalPrice/
//   originalMargin/proposedMargin/counterOfferPercent are Decimal
//   columns, which serialize to JSON as strings -- Number() on every
//   read.
// - requestedDate/validUntil/decidedAt are DateTime columns, sliced to
//   plain date strings to match src/types/discountApproval.ts.
// - The API's nested `steps` (DiscountApprovalStep rows, DB shape) map
//   to the frontend's flat `approvalHistory` (ApprovalStep[], the
//   original component-local shape) here, not in the component.

import type {
  DiscountRequest,
  ApprovalStep,
  NewDiscountRequest,
  DiscountDecisionInput,
} from '@/types/discountApproval';
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
    console.error(`discountApprovalsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

function fromApiStep(row: any): ApprovalStep {
  return {
    level: row.level,
    approverName: row.approverName,
    approverRole: row.approverRole,
    action: row.action,
    date: row.decidedAt ? String(row.decidedAt).slice(0, 10) : undefined,
    comment: row.comment ?? undefined,
    counterOfferPercent:
      row.counterOfferPercent !== null && row.counterOfferPercent !== undefined
        ? Number(row.counterOfferPercent)
        : undefined,
    conditionsAdded: row.conditionsAdded ?? undefined,
  };
}

function fromApiRequest(row: any): DiscountRequest {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    clientName: row.clientName,
    opportunityId: row.opportunityId ?? '',
    productName: row.productName,
    originalPrice: Number(row.originalPrice),
    discountPercent: Number(row.discountPercent),
    discountAmount: Number(row.discountAmount),
    finalPrice: Number(row.finalPrice),
    requestedBy: row.requestedByName,
    requestedDate: typeof row.requestedDate === 'string' ? row.requestedDate.slice(0, 10) : row.requestedDate,
    reason: row.reason,
    status: row.status,
    currentApprover: row.currentApprover ?? '-',
    approvalLevel: row.approvalLevel,
    approvalHistory: ((row.steps ?? []) as any[]).map(fromApiStep),
    urgency: row.urgency,
    validUntil: row.validUntil ? String(row.validUntil).slice(0, 10) : '',
    originalMargin: Number(row.originalMargin),
    proposedMargin: Number(row.proposedMargin),
    region: row.region ?? '',
    conditions: row.conditions ?? undefined,
  };
}

export const discountApprovalsRepository = {
  async getAll(): Promise<Result<DiscountRequest[]>> {
    const res = await apiFetch<any[]>('/api/discount-approvals');
    if (!res.success || !res.data) return res as Result<DiscountRequest[]>;
    return { success: true, data: res.data.map(fromApiRequest) };
  },

  async getById(id: string): Promise<Result<DiscountRequest>> {
    const res = await apiFetch<any>(`/api/discount-approvals/${id}`);
    if (!res.success || !res.data) return res as Result<DiscountRequest>;
    return { success: true, data: fromApiRequest(res.data) };
  },

  async create(input: NewDiscountRequest): Promise<Result<DiscountRequest>> {
    const res = await apiFetch<any>('/api/discount-approvals', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.success || !res.data) return res as Result<DiscountRequest>;
    return { success: true, data: fromApiRequest(res.data) };
  },

  // Decides whichever level is currently pending (approve/reject/counter-offer)
  // -- see handleDiscountApprovals's PUT branch in api/handler.ts.
  async decide(id: string, decision: DiscountDecisionInput): Promise<Result<DiscountRequest>> {
    const res = await apiFetch<any>(`/api/discount-approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(decision),
    });
    if (!res.success || !res.data) return res as Result<DiscountRequest>;
    return { success: true, data: fromApiRequest(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/discount-approvals/${id}`, { method: 'DELETE' });
  },
};
