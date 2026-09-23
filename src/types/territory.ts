// Territory profile — the parts of a territory that are NOT target/actual/
// forecast data (those live in performance_targets / PerformanceTarget,
// keyed by territoryId). Keeping profile and performance data in separate
// stores mirrors the SQL schema (territories table vs performance_targets)
// and avoids re-introducing the "achievement computed and stored inline"
// duplication this Tahap A pass is meant to remove.
//
// Bab-follow-up (23 Sep 2026): leads/opportunities are now derived,
// read-only counts computed server-side from Lead.territoryId/
// Opportunity.territoryId (see api/handler.ts's handleTerritories) — they
// are NEVER sent in a create/update payload, only ever returned by the
// API. NewTerritoryProfile therefore omits them.
export interface TerritoryProfile {
  id: string;
  name: string;
  region: string;
  assignedTo: string;
  leads: number;
  opportunities: number;
  coverage: number;
  createdAt: string;
  updatedAt: string;
}

export type NewTerritoryProfile = Omit<TerritoryProfile, 'id' | 'createdAt' | 'updatedAt' | 'leads' | 'opportunities'>;

// View-model combining TerritoryProfile with its performance-period figures
// (target/actual/achievement from performanceTargetsRepository, via
// computeAchievementPct). This is what TerritoryManagement.tsx builds and
// passes down to TerritoryMap.tsx — previously each file re-declared this
// same 10-field shape independently with no shared import, so the two could
// silently drift out of sync. `revenue` here is the period's actual figure.
export interface TerritoryWithPerformance {
  id: string;
  name: string;
  region: string;
  assignedTo: string;
  leads: number;
  opportunities: number;
  revenue: number;
  target: number;
  achievement: number;
  coverage: number;
}
