// Lead model -- moved out of dummyData.ts (Fase 1 item 5: one consistent
// definition in src/types instead of scattered across data/component
// files). No field changes, straight move. The dummy `leads` array stays
// in dummyData.ts; only the type definition moves.

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
  source: string;
  assignedTo: string;
  createdAt: Date;
  lastContact: Date;
  notes: string;
  // Bab 32/33 (24 Sep 2026, deep review + smoke test grup Produk & Wilayah):
  // backend (Lead.territoryId, api/handler.ts's handleLeads) already
  // supported this field, and Territory Management's "Leads" count per
  // territory was already computed from it -- but no UI anywhere let a
  // user actually set it, so that count was structurally guaranteed to
  // read 0 forever. Added here + a Territory picker in LeadManagement.tsx.
  territoryId?: string | null;
}
