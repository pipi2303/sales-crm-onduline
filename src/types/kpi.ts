// KPI Sales Type Definitions
export interface SalesKPI {
  // Primary
  kpi_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_avatar?: string;
  periode_bulan: string; // Format: "Januari 2026"
  
  // 1. Indikator Aktivitas (Input Metrics)
  total_kunjungan_toko: number; // Kunjungan fisik via Geo-tagging ke Toko/Distributor
  total_sesi_demo: number; // Presentasi katalog & sampel produk Onduline
  jumlah_leads_baru: number; // Prospek baru di pipeline
  
  // 2. Indikator Hasil (Output Metrics)
  // Kategori lini produk Onduline (bukan lagi tipe fasilitas kesehatan) --
  // lihat product_categories/product_families di prisma/schema.prisma.
  target_revenue_q: number; // Target nominal kuartal
  actual_revenue_q: number; // Realisasi penjualan
  jumlah_closing_atap_bitumen: number; // Total unit Atap Bitumen (Onduline Classic/Easyfix) kontrak
  jumlah_closing_waterproofing: number; // Total unit produk Waterproofing kontrak
  jumlah_closing_solar: number; // Total unit Photovoltaic/Solar kontrak
  jumlah_closing_green_roof: number; // Total unit Green Roof kontrak
  jumlah_closing_aksesoris: number; // Total unit Aksesoris & Talang kontrak
  conversion_rate: number; // % demo → closing (auto calculated)
  
  // 3. Indikator Strategis (Product Push) -- metrik cross-sell/high-margin
  // yang independen dari kategori penjualan utama di atas.
  persentase_cross_sell_aksesoris: number; // Rasio deal yang juga menyertakan Aksesoris & Talang
  unit_solar_terjual: number; // Unit Photovoltaic/Solar terjual (lintas semua lini, high-margin)
  adopsi_ecatalog_klien: number; // Klien yang aktif pakai katalog digital Onduline
  
  // 4. Indikator Kualitas & Retensi
  customer_satisfaction_score: number; // CSAT (1-5)
  churn_rate_client: number; // % klien berhenti
  average_closing_time: number; // Rata-rata hari lead → closing
  
  // 5. Kalkulasi Bonus & Insentif
  pencapaian_target_persen: number; // (Actual / Target * 100)
  status_elite_circle: boolean; // True jika >100%
  estimasi_komisi_bulanan: number; // Total komisi
  accumulated_annual_bonus: number; // Bonus tahunan
  
  // Metadata
  last_updated: Date;
  created_at: Date;
}

export interface LeaderboardEntry {
  rank: number;
  employee_id: string;
  employee_name: string;
  employee_avatar?: string;
  actual_revenue: number;
  target_achieved_percent: number;
  total_closings: number;
  top_module?: string; // "Aksesoris" | "Solar" | "E-Catalog"
  badges: string[];
  is_elite: boolean;
}

export interface KPISummary {
  total_sales_team: number;
  total_revenue_achieved: number;
  total_revenue_target: number;
  average_achievement: number;
  elite_circle_members: number;
  top_performer: LeaderboardEntry | null;
}
