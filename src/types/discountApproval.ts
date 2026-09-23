// Discount approval workflow (Bab 10 gap #3, Rencana Insight doc).
// DiscountApprovalSystem.tsx already had a full multi-level approval UI
// (margin calculator, approval levels, counter-offer, conditional
// approval), but every request lived only in the component's own
// hardcoded useState array -- approve/reject never even updated that
// in-memory array, only showed a toast. These types match
// prisma/schema.prisma's DiscountApprovalRequest/DiscountApprovalStep,
// kept field-compatible with the original component-local interfaces so
// the render code didn't need to change, only where the data comes from.
export type DiscountRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'counter-offer';
export type ApprovalStepAction = 'pending' | 'approved' | 'rejected' | 'counter-offer';

export interface ApprovalStep {
  level: number;
  approverName: string;
  approverRole: string;
  action: ApprovalStepAction;
  date?: string;
  comment?: string;
  counterOfferPercent?: number;
  conditionsAdded?: string;
}

export interface DiscountRequest {
  id: string;
  requestNumber: string;
  clientName: string;
  opportunityId: string;
  productName: string;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  requestedBy: string;
  requestedDate: string;
  reason: string;
  status: DiscountRequestStatus;
  currentApprover: string;
  approvalLevel: number;
  approvalHistory: ApprovalStep[];
  urgency: string;
  validUntil: string;
  originalMargin: number;
  proposedMargin: number;
  region: string;
  conditions?: string;
}

// Level (1-4) is derived server-side from discountPercent
// (discountLevelForPercent in api/handler.ts) -- not sent by the client.
export interface NewDiscountRequest {
  clientName: string;
  opportunityId?: string;
  productName: string;
  originalPrice: number;
  discountPercent: number;
  reason: string;
  urgency?: string;
  validUntil?: string;
  originalMargin: number;
  proposedMargin: number;
  region?: string;
}

export interface DiscountDecisionInput {
  action: 'approve' | 'reject' | 'counter-offer';
  comment?: string;
  conditionsAdded?: string;
  counterOfferPercent?: number;
  conditions?: string;
}
