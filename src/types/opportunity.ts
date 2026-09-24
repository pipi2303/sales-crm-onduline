// Opportunity pipeline model -- moved out of OpportunityManagement.tsx so the
// six other components that consume these shapes (OpportunityList,
// SalesForecast, OpportunityPipeline, OpportunityForm, OpportunityFormNew,
// OpportunityDetailDialog) import from src/types like every other shared
// model, instead of reaching into a sibling component file for a type.
// No field changes -- this is a straight move, not a redesign.

export interface ProductItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy?: string;
  // Bab 16.5 (24 Sep 2026): opsional -- kalau aktivitas ini adalah
  // pertemuan dengan salah satu kontak di org tree client-nya (lihat
  // src/types/clientContact.ts). Dipakai LogMeetingDialog.tsx supaya
  // "jumlah pertemuan" per kontak bisa dihitung dari data ini.
  contactId?: string;
}

export interface Opportunity {
  id: string;
  name: string;
  leadId?: string;
  // Bab 12 follow-up (insight #1/#6, 23 Sep 2026): sudah ada di Prisma
  // model (Opportunity.clientId) sejak awal, tapi belum pernah di-expose
  // ke shape frontend -- dibutuhkan untuk join Opportunity -> Client ->
  // Distributor/Store demi agregasi heatmap performa & penetrasi
  // kategori produk.
  clientId?: string;
  clientName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  
  // Products
  products: ProductItem[];
  
  // Financial
  totalValue: number;
  currency: string;
  probability: number;
  
  // Timeline
  createdDate?: string;
  closeDate: string;
  actualCloseDate?: string;
  
  // Sales Process
  stage: 'prospecting' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  status: 'open' | 'won' | 'lost';
  lossReason?: string;
  // FR-04: Close Reason/Detail, required before an Opportunity can move to Closed Won/Lost.
  // Bab 30 (24 Sep 2026, hasil deep review + smoke test grup Sales
  // Pipeline): dilebarkan ke `| null` supaya "kosongkan field ini" bisa
  // dikirim eksplisit ke backend. Sebelumnya kode pengosongan memakai
  // `undefined`, tapi JSON.stringify() membuang key ber-nilai undefined
  // sebelum body request terbentuk (opportunitiesRepository.ts's
  // toApiPayload) -- jadi "kosongkan" itu tidak pernah benar-benar
  // sampai ke server, dan closeReason/closeDetail lama tetap nyangkut di
  // DB. `null` selamat dari JSON.stringify dan backend (api/handler.ts)
  // sudah menerimanya dengan benar sebagai "set ke NULL" (kolomnya
  // nullable di schema.prisma).
  closeReason?: string | null;
  closeDetail?: string | null;
  
  // Assignment
  ownerId?: string;
  ownerName: string;
  
  // Additional Info
  source: string;
  description: string;
  notes?: string;
  
  // Reminders
  nextFollowUpDate?: string;
  reminderSent: boolean;
  activities: Activity[];
  
  // NEW FIELDS - Sales Process Details
  opportunityMaturity?: {
    selected: boolean; // S - Selected
    funded: boolean; // F - Funded
    timeline: boolean; // T - Timeline
  };
  budgetStatus?: 'Budget Proposed' | 'Budget Approved' | 'Budget Released' | '';
  target?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  targetYear?: string;
  closingTarget?: string; // calendar date
  forecastType?: 'Pipeline' | 'Upside' | 'Strong Upside' | 'Forecast/Commit';
  lowHangingFruit?: boolean;
  solution?: string;
  product?: string;
  existingSystem?: string;
  competitor?: string;
  competitorWebsite?: string;
  partnerName?: string;
  partnerId?: string;
  salesRep?: string;
  salesRepId?: string;
  bizmod?: string;
  // Bab 30 (24 Sep 2026, hasil deep review + smoke test grup Sales
  // Pipeline): field ini sudah punya input UI di OpportunityFormNew.tsx
  // (Contract Period, tab Sales Details) sejak awal, tapi tidak pernah
  // dideklarasikan di sini ATAU dimasukkan ke EXTRA_KEYS di
  // opportunitiesRepository.ts -- jadi terkirim sebagai key top-level yang
  // tidak pernah dibaca backend (bukan error, tapi juga tidak pernah
  // tersimpan): user pilih nilainya, terlihat selama dialog terbuka, lalu
  // hilang lagi begitu dibuka ulang.
  contractPeriod?: string;
  annualRevenue?: number;
  sizeOfDeal?: number;
  monthlyRev?: number;
  salesStage?: 'Engage' | 'Understand' | 'Solution' | 'Align' | 'Execute' | 'Close (Win/Loss)';
  winProbability?: number;
  currentStatus?: string;
  nextAction?: string;
  
  // Overview Details
  managerNotes?: string;
  actionsToClose?: string;
  engineerNotes?: string;
  
  // Commercial Detail
  whyBuyAnything?: string;
  whyBuyNow?: string;
  evaluationStarted?: boolean;
  // Fase 1 (23 Sep 2026): this used to be named `budgetStatus` too, the
  // same name as the Sales Process Details field above (line ~74), just
  // with a different value set ('No'|'Available'|'Approved' vs 'Budget
  // Proposed'|'Budget Approved'|'Budget Released'). TypeScript actually
  // rejects a duplicate property (only caught because `vite build` skips
  // type-checking), and at runtime OpportunityFormNew.tsx's handleSubmit
  // spread `...salesDetails` then `...commercialDetails` into the same
  // save payload, so this field silently overwrote/discarded whatever the
  // Sales Process Details tab's Budget Status dropdown had just been set
  // to. Renamed to make the two independent -- this is "23.04.04 Budget
  // Status?" from the Commercial Detail tab.
  budgetAvailabilityStatus?: 'No' | 'Available' | 'Approved';
  whyBuyIntramedika?: string;
  winStrategyBuyingProcess?: string;
  jointExecutionPlanCreated?: string;
  vendorChoice?: boolean;
  agreementStatus?: 'Agreement Reviewed' | 'Terms & Conditions Agreed' | null;
  customerCommit?: 'No' | 'Customer Commit in 90 Days' | 'Commit to Sign';
  businessCaseStatus?: 'Business Case Validated' | 'No Business Case Required' | null;
  jointExecutionPlanAgreed?: 'N/A' | 'No' | 'Yes';
  risk?: string;
  
  // Technical Detail
  functionFit?: 'Major Gaps' | 'Some Gaps (addressable)' | 'No Gaps';
  competitiveDifferentiation?: 'Disadvantage' | 'Neutral' | 'Clear Advantage';
  solutionDemoStatus?: boolean;
  implementationStrategy?: 'No Implementation Required' | 'Strategy Known' | null;
  solutionArchitectureValidated?: boolean;
  implementationPlanAgreed?: boolean;
  
  // Timestamps for Sales Detail fields
  timestamps?: {
    currentStatus?: string | null;
    nextAction?: string | null;
    notes?: string | null;
  };
  
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
