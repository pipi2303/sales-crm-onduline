// Client segment tiering for Onduline's actual business categories
// (kategori_client: Toko Bangunan/Distributor/Kontraktor/Developer/
// Instansi Pemerintah/End User -- see src/types/client.ts).
//
// Fase 1 item 5 (unify Client data model, 23 Sep 2026): replaces the old
// hospital bed-count heuristic (jumlah_tempat_tidur, removed in
// prisma/migrations/20260923100000_unify_client_data_model) that
// AILeadScoring.tsx/AISmartRecommendations.tsx used for deal-size and
// lead-score math. That heuristic was already silently broken -- the
// kategori_client values were renamed to Onduline categories in an
// earlier round (commit 15b467c3), so the "rumah sakit"/"klinik" string
// checks that picked a base deal size never matched anymore, and every
// client fell through to one generic default regardless of actual
// segment.
//
// Single source of truth so both AI components stay in sync -- tune the
// numbers here, not in either component.
export interface ClientSegmentProfile {
  /** 0-25: relative weight for AILeadScoring's scoring breakdown. */
  tierScore: number;
  /** Typical first-deal size in rupiah for this segment. */
  baseDealSize: number;
  /** Typical upsell/cross-sell value in rupiah for this segment. */
  upsellValue: number;
}

const SEGMENT_PROFILES: Record<string, ClientSegmentProfile> = {
  // Large, one-off project volumes (housing complexes, government
  // buildings) -- highest deal size and scoring weight.
  'Developer': { tierScore: 25, baseDealSize: 250_000_000, upsellValue: 100_000_000 },
  'Instansi Pemerintah': { tierScore: 22, baseDealSize: 200_000_000, upsellValue: 85_000_000 },
  // Recurring wholesale volume.
  'Distributor': { tierScore: 18, baseDealSize: 120_000_000, upsellValue: 60_000_000 },
  'Kontraktor': { tierScore: 15, baseDealSize: 90_000_000, upsellValue: 50_000_000 },
  // Smaller, more frequent retail-shaped orders.
  'Toko Bangunan': { tierScore: 10, baseDealSize: 50_000_000, upsellValue: 30_000_000 },
  'End User': { tierScore: 5, baseDealSize: 20_000_000, upsellValue: 15_000_000 },
};

const DEFAULT_PROFILE: ClientSegmentProfile = { tierScore: 10, baseDealSize: 50_000_000, upsellValue: 30_000_000 };

export function getClientSegmentProfile(kategoriClient?: string): ClientSegmentProfile {
  if (!kategoriClient) return DEFAULT_PROFILE;
  return SEGMENT_PROFILES[kategoriClient] ?? DEFAULT_PROFILE;
}

// Rough signal for AI competition scoring: does this client's
// vendor_sebelumnya field (renamed from the healthcare-era sistem_lama/
// "Sistem Lama SIMRS") mention an existing vendor/distributor
// relationship? Free text, not structured data, so this is a heuristic,
// not a lookup -- an explicit "belum ada distributor tetap" or an empty
// value reads as no competition signal.
export function hasExistingVendorSignal(vendorSebelumnya?: string): boolean {
  if (!vendorSebelumnya) return false;
  const v = vendorSebelumnya.trim().toLowerCase();
  if (!v || v === '-' || v.includes('belum ada')) return false;
  return true;
}
