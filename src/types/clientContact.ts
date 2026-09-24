// Bab 16.5 -- Organisation Tree / Influence Mapping & Customer Intelligence
// (24 Sep 2026). Lihat catatan desain lengkap di prisma/schema.prisma
// (dekat model ClientContact / ClientIntelligence) untuk alasan kenapa ini
// terpisah dari nama_pic/jabatan_pic yang sudah ada di Client.
//
// Enum di sini pakai hyphenated lower-case (bukan SCREAMING_SNAKE_CASE) --
// konvensi yang sama dengan Opportunity['stage'] di
// src/types/opportunity.ts (lihat STAGE_OUT/STAGE_IN di
// opportunitiesRepository.ts) -- persis sama dengan nilai @map() di
// prisma/schema.prisma supaya gampang dicocokkan mata.

export type InfluenceRole =
  | 'decision-maker'
  | 'approver'
  | 'influencer'
  | 'technical-advisor'
  | 'consultant';

export type RelationshipStatus = 'positive' | 'neutral' | 'negative';

export type RelationshipCloseness = 'baru-kenal' | 'kenal-baik' | 'champion';

export interface ClientContact {
  id: string;
  client_id: string;
  nama: string;
  jabatan: string;
  email: string;
  telepon: string;
  whatsapp: string;
  influence_role: InfluenceRole;
  relationship_status: RelationshipStatus;
  closeness: RelationshipCloseness;
  reports_to_id: string; // '' kalau tidak lapor ke siapa pun (top of tree)
  notes: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  // Dihitung dari OpportunityActivity yang contact_id-nya menunjuk ke
  // kontak ini (lihat handleClientContacts di api/handler.ts) -- bukan
  // kolom counter terpisah, jadi selalu sinkron dengan data aktivitas asli.
  meeting_count: number;
}

export interface ClientIntelligence {
  id: string;
  client_id: string;
  profil_bisnis: string;
  proyek_berjalan: string;
  kompetitor_eksisting: string;
  sumber_informasi: string;
  catatan_tambahan: string;
  // Daftar link referensi bebas, mis. { "Company profile": "https://...",
  // "LinkedIn CEO": "https://..." } -- disimpan apa adanya sebagai JSON,
  // sama seperti Opportunity.extra.
  links: Record<string, string> | null;
  updated_by_id: string;
  created_at: string;
  updated_at: string;
}

export const INFLUENCE_ROLE_LABELS: Record<InfluenceRole, string> = {
  'decision-maker': 'Decision Maker',
  approver: 'Approver',
  influencer: 'Influencer',
  'technical-advisor': 'Technical Advisor',
  consultant: 'Consultant',
};

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

export const RELATIONSHIP_CLOSENESS_LABELS: Record<RelationshipCloseness, string> = {
  'baru-kenal': 'Baru Kenal',
  'kenal-baik': 'Kenal Baik',
  champion: 'Champion',
};
