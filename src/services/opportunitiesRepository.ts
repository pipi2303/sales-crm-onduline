// Opportunities repository — same adapter pattern as productsRepository.ts /
// leadsRepository.ts.
//
// Fase 1 item 2, Opportunity module — the third and last of the three
// pilot modules. Replaces src/services/api.ts's opportunitiesApi (which
// only ever read/wrote localStorage) with real calls to
// GET/POST/PUT/DELETE /api/opportunities (prisma/schema.prisma's
// Opportunity model).
//
// Shape gaps bridged here:
// - OpportunityStage / OpportunityStatus are SCREAMING_SNAKE_CASE Prisma
//   enums server-side, lower-case (with dashes for stage) string literals
//   client-side — STAGE_OUT/STAGE_IN, STATUS_OUT/STATUS_IN.
// - totalValue, and each product line's unitPrice/totalPrice, are Decimal
//   columns, which serialize to JSON as strings — Number() on every read.
// - Everything from src/types/opportunity.ts with no dedicated Opportunity
//   column — the ~40 Overview/Commercial/Technical-Detail fields the
//   model's own comment already earmarks for this, PLUS `fieldHistory`
//   (used by OpportunityFormNew.tsx via `(opp as any).fieldHistory` but
//   never declared on the Opportunity type at all — same class of gap as
//   Lead's companies/position) — round-trips through Opportunity.extra.
//   EXTRA_KEYS is the explicit list, same reasoning as leadsRepository.ts.
// - products/activities are relations, not scalar columns: toApiPayload
//   passes them through as plain arrays and api/opportunities/[id].ts's
//   PUT does a full delete+recreate of each on every update (the UI always
//   sends the complete current array for both, never a delta).
//
// getReminders(): Bab 30 fix (24 Sep 2026, hasil deep review + smoke test
// grup Sales Pipeline). OpportunityManagement.tsx expects `priority` and
// `reminderMessage` (and reads `daysUntilClose`) on each reminder, but
// neither the old localStorage fallback nor any server route ever actually
// computed them -- the "Action Required" badge literally rendered
// "undefinedd left" for every card, and the urgent-priority toast
// (`reminder.priority === 'urgent'`) could never fire since priority was
// always undefined. Now computed here from closeDate, same 7-day lookahead
// window as before, extended to also surface already-overdue open deals
// (the UI already had an `Overdue` label ready for negative daysUntilClose,
// it just never received one) and excluding deals that are already
// won/lost (a closed deal doesn't need a close-date reminder).

import type { Opportunity, ProductItem, Activity } from '@/types/opportunity';
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
    console.error(`opportunitiesRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

type Stage = Opportunity['stage'];
type Status = Opportunity['status'];

const STAGE_OUT: Record<Stage, string> = {
  prospecting: 'PROSPECTING',
  proposal: 'PROPOSAL',
  negotiation: 'NEGOTIATION',
  'closed-won': 'CLOSED_WON',
  'closed-lost': 'CLOSED_LOST',
};
const STAGE_IN: Record<string, Stage> = {
  PROSPECTING: 'prospecting',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  CLOSED_WON: 'closed-won',
  CLOSED_LOST: 'closed-lost',
};

const STATUS_OUT: Record<Status, string> = {
  open: 'OPEN',
  won: 'WON',
  lost: 'LOST',
};
const STATUS_IN: Record<string, Status> = {
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
};

// UI fields with no dedicated Opportunity column — see the file header.
// Kept as an explicit list (not "everything unrecognized") so a typo'd
// field name fails loudly by just not round-tripping, rather than
// silently being accepted as "extra".
const EXTRA_KEYS = [
  'opportunityMaturity', 'budgetStatus', 'target', 'targetYear', 'closingTarget', 'forecastType',
  'lowHangingFruit', 'solution', 'product', 'existingSystem', 'competitor', 'competitorWebsite',
  'partnerName', 'partnerId', 'salesRep', 'salesRepId', 'bizmod', 'annualRevenue', 'sizeOfDeal',
  'monthlyRev', 'salesStage', 'winProbability', 'currentStatus', 'nextAction', 'managerNotes',
  'actionsToClose', 'engineerNotes', 'whyBuyAnything', 'whyBuyNow', 'evaluationStarted',
  'whyBuyIntramedika', 'winStrategyBuyingProcess', 'jointExecutionPlanCreated', 'vendorChoice',
  'agreementStatus', 'customerCommit', 'businessCaseStatus', 'jointExecutionPlanAgreed', 'risk',
  'functionFit', 'competitiveDifferentiation', 'solutionDemoStatus', 'implementationStrategy',
  'solutionArchitectureValidated', 'implementationPlanAgreed', 'contractPeriod', 'timestamps', 'fieldHistory',
] as const;

type OpportunityWithExtra = Opportunity & Record<string, unknown>;

function toApiPayload(input: Partial<OpportunityWithExtra>): Record<string, unknown> {
  const { stage, status, products, ...rest } = input as Record<string, unknown> & {
    stage?: Stage;
    status?: Status;
    products?: ProductItem[];
  };
  const payload: Record<string, unknown> = { ...rest };
  if (stage) payload.stage = STAGE_OUT[stage];
  if (status) payload.status = STATUS_OUT[status];
  if (products) {
    payload.products = products.map((p) => ({
      productId: p.productId || undefined,
      productName: p.productName,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.totalPrice,
    }));
  }

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

function fromApiOpportunity(row: any): OpportunityWithExtra {
  return {
    id: row.id,
    name: row.name,
    leadId: row.leadId ?? undefined,
    clientId: row.clientId ?? undefined,
    clientName: row.clientName,
    contactPerson: row.contactPerson,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,

    products: (row.products ?? []).map((p: any): ProductItem => ({
      productId: p.productId ?? '',
      productName: p.productName,
      quantity: p.quantity,
      unitPrice: Number(p.unitPrice),
      totalPrice: Number(p.totalPrice),
    })),

    totalValue: Number(row.totalValue),
    currency: row.currency,
    probability: row.probability,

    createdDate: row.createdDate ?? undefined,
    closeDate: row.closeDate,
    actualCloseDate: row.actualCloseDate ?? undefined,

    stage: STAGE_IN[row.stage] ?? 'prospecting',
    status: STATUS_IN[row.status] ?? 'open',
    lossReason: row.lossReason ?? undefined,
    closeReason: row.closeReason ?? undefined,
    closeDetail: row.closeDetail ?? undefined,

    ownerId: row.ownerId ?? undefined,
    ownerName: row.ownerName,

    source: row.source ?? '',
    description: row.description ?? '',
    notes: row.notes ?? undefined,

    nextFollowUpDate: row.nextFollowUpDate ?? undefined,
    reminderSent: row.reminderSent,
    activities: (row.activities ?? []).map((a: any): Activity => ({
      id: a.id,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt,
      createdBy: a.createdBy ?? undefined,
      contactId: a.contactId ?? undefined,
    })),

    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    // The ~40 Overview/Commercial/Technical-Detail fields, plus
    // fieldHistory — see EXTRA_KEYS / the file header.
    ...(row.extra ?? {}),
  };
}

export const opportunitiesRepository = {
  async getAll(): Promise<Result<OpportunityWithExtra[]>> {
    const res = await apiFetch<any[]>('/api/opportunities');
    if (!res.success || !res.data) return res as Result<OpportunityWithExtra[]>;
    return { success: true, data: res.data.map(fromApiOpportunity) };
  },

  async getById(id: string): Promise<Result<OpportunityWithExtra>> {
    const res = await apiFetch<any>(`/api/opportunities/${id}`);
    if (!res.success || !res.data) return res as Result<OpportunityWithExtra>;
    return { success: true, data: fromApiOpportunity(res.data) };
  },

  async create(input: Partial<OpportunityWithExtra>): Promise<Result<OpportunityWithExtra>> {
    const res = await apiFetch<any>('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<OpportunityWithExtra>;
    return { success: true, data: fromApiOpportunity(res.data) };
  },

  async update(id: string, updates: Partial<OpportunityWithExtra>): Promise<Result<OpportunityWithExtra>> {
    const res = await apiFetch<any>(`/api/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<OpportunityWithExtra>;
    return { success: true, data: fromApiOpportunity(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/opportunities/${id}`, { method: 'DELETE' });
  },

  // OpportunityManagement.tsx polls this every 60s and expects
  // `priority`/`reminderMessage` on each item — see the file header for
  // why those two are never actually set here (they never were, even
  // before this file existed).
  async getReminders(): Promise<Result<OpportunityWithExtra[]>> {
    const res = await this.getAll();
    if (!res.success || !res.data) return res;
    const today = new Date();
    const reminders = res.data
      .filter((opp) => opp.status === 'open' && !!opp.closeDate)
      .map((opp) => {
        const closeDate = new Date(opp.closeDate);
        const daysUntilClose = Math.floor((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { opp, daysUntilClose };
      })
      .filter(({ daysUntilClose }) => daysUntilClose <= 7)
      .map(({ opp, daysUntilClose }) => {
        const priority: 'urgent' | 'high' | 'medium' | 'low' =
          daysUntilClose <= 2 ? 'urgent' : daysUntilClose <= 5 ? 'high' : 'medium';
        const reminderMessage =
          daysUntilClose < 0
            ? `${opp.name} sudah melewati target close ${Math.abs(daysUntilClose)} hari yang lalu!`
            : daysUntilClose === 0
            ? `${opp.name} target close HARI INI!`
            : `${opp.name} target close dalam ${daysUntilClose} hari.`;
        return { ...opp, daysUntilClose, priority, reminderMessage };
      });
    return { success: true, data: reminders };
  },
};
