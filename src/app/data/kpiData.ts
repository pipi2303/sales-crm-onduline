import { SalesKPI, LeaderboardEntry, KPISummary } from '@/types/kpi';

// Generate dummy KPI data for January 2026
export const generateKPIData = (): SalesKPI[] => {
  const periode = "Januari 2026";
  
  return [
    {
      kpi_id: 'KPI001',
      employee_id: '1',
      employee_name: 'Budi Santoso',
      employee_email: 'budi.santoso@onduline.co.id',
      periode_bulan: periode,
      
      // Activity Metrics
      total_kunjungan_toko: 45,
      total_sesi_demo: 32,
      jumlah_leads_baru: 28,
      
      // Output Metrics
      target_revenue_q: 500000000, // 500 juta
      actual_revenue_q: 575000000, // 575 juta (115%)
      jumlah_closing_atap_bitumen: 6,
      jumlah_closing_waterproofing: 4,
      jumlah_closing_solar: 2,
      jumlah_closing_green_roof: 1,
      jumlah_closing_aksesoris: 3,
      conversion_rate: 50.0, // 16/32
      
      // Strategic Metrics
      persentase_cross_sell_aksesoris: 75.0,
      unit_solar_terjual: 4,
      adopsi_ecatalog_klien: 12,
      
      // Quality Metrics
      customer_satisfaction_score: 4.8,
      churn_rate_client: 2.5,
      average_closing_time: 18,
      
      // Financial
      pencapaian_target_persen: 115.0,
      status_elite_circle: true,
      estimasi_komisi_bulanan: 28750000, // 5% dari revenue
      accumulated_annual_bonus: 28750000,
      
      last_updated: new Date(),
      created_at: new Date('2026-01-01'),
    },
    {
      kpi_id: 'KPI002',
      employee_id: '2',
      employee_name: 'Siti Nurhaliza',
      employee_email: 'siti.nurhaliza@onduline.co.id',
      periode_bulan: periode,
      
      total_kunjungan_toko: 52,
      total_sesi_demo: 38,
      jumlah_leads_baru: 35,
      
      target_revenue_q: 450000000,
      actual_revenue_q: 495000000, // 110%
      jumlah_closing_atap_bitumen: 7,
      jumlah_closing_waterproofing: 5,
      jumlah_closing_solar: 2,
      jumlah_closing_green_roof: 2,
      jumlah_closing_aksesoris: 3,
      conversion_rate: 55.3,
      
      persentase_cross_sell_aksesoris: 80.0,
      unit_solar_terjual: 6,
      adopsi_ecatalog_klien: 15,
      
      customer_satisfaction_score: 4.9,
      churn_rate_client: 1.8,
      average_closing_time: 15,
      
      pencapaian_target_persen: 110.0,
      status_elite_circle: true,
      estimasi_komisi_bulanan: 24750000,
      accumulated_annual_bonus: 24750000,
      
      last_updated: new Date(),
      created_at: new Date('2026-01-01'),
    },
    {
      kpi_id: 'KPI003',
      employee_id: '3',
      employee_name: 'Ahmad Rizki',
      employee_email: 'ahmad.rizki@onduline.co.id',
      periode_bulan: periode,
      
      total_kunjungan_toko: 38,
      total_sesi_demo: 28,
      jumlah_leads_baru: 22,
      
      target_revenue_q: 400000000,
      actual_revenue_q: 420000000, // 105%
      jumlah_closing_atap_bitumen: 5,
      jumlah_closing_waterproofing: 3,
      jumlah_closing_solar: 1,
      jumlah_closing_green_roof: 1,
      jumlah_closing_aksesoris: 3,
      conversion_rate: 46.4,
      
      persentase_cross_sell_aksesoris: 65.0,
      unit_solar_terjual: 3,
      adopsi_ecatalog_klien: 9,
      
      customer_satisfaction_score: 4.6,
      churn_rate_client: 3.2,
      average_closing_time: 21,
      
      pencapaian_target_persen: 105.0,
      status_elite_circle: true,
      estimasi_komisi_bulanan: 21000000,
      accumulated_annual_bonus: 21000000,
      
      last_updated: new Date(),
      created_at: new Date('2026-01-01'),
    },
    {
      kpi_id: 'KPI004',
      employee_id: '4',
      employee_name: 'Dewi Lestari',
      employee_email: 'dewi.lestari@onduline.co.id',
      periode_bulan: periode,
      
      total_kunjungan_toko: 42,
      total_sesi_demo: 30,
      jumlah_leads_baru: 25,
      
      target_revenue_q: 450000000,
      actual_revenue_q: 427500000, // 95%
      jumlah_closing_atap_bitumen: 6,
      jumlah_closing_waterproofing: 4,
      jumlah_closing_solar: 1,
      jumlah_closing_green_roof: 1,
      jumlah_closing_aksesoris: 3,
      conversion_rate: 50.0,
      
      persentase_cross_sell_aksesoris: 70.0,
      unit_solar_terjual: 5,
      adopsi_ecatalog_klien: 11,
      
      customer_satisfaction_score: 4.7,
      churn_rate_client: 2.0,
      average_closing_time: 19,
      
      pencapaian_target_persen: 95.0,
      status_elite_circle: false,
      estimasi_komisi_bulanan: 21375000,
      accumulated_annual_bonus: 21375000,
      
      last_updated: new Date(),
      created_at: new Date('2026-01-01'),
    },
    {
      kpi_id: 'KPI005',
      employee_id: '5',
      employee_name: 'Eko Prasetyo',
      employee_email: 'eko.prasetyo@onduline.co.id',
      periode_bulan: periode,
      
      total_kunjungan_toko: 35,
      total_sesi_demo: 25,
      jumlah_leads_baru: 20,
      
      target_revenue_q: 400000000,
      actual_revenue_q: 360000000, // 90%
      jumlah_closing_atap_bitumen: 5,
      jumlah_closing_waterproofing: 3,
      jumlah_closing_solar: 1,
      jumlah_closing_green_roof: 1,
      jumlah_closing_aksesoris: 2,
      conversion_rate: 48.0,
      
      persentase_cross_sell_aksesoris: 60.0,
      unit_solar_terjual: 2,
      adopsi_ecatalog_klien: 8,
      
      customer_satisfaction_score: 4.5,
      churn_rate_client: 3.8,
      average_closing_time: 24,
      
      pencapaian_target_persen: 90.0,
      status_elite_circle: false,
      estimasi_komisi_bulanan: 18000000,
      accumulated_annual_bonus: 18000000,
      
      last_updated: new Date(),
      created_at: new Date('2026-01-01'),
    },
    {
      kpi_id: 'KPI006',
      employee_id: '6',
      employee_name: 'Rina Wijaya',
      employee_email: 'rina.wijaya@onduline.co.id',
      periode_bulan: periode,
      
      total_kunjungan_toko: 30,
      total_sesi_demo: 22,
      jumlah_leads_baru: 18,
      
      target_revenue_q: 350000000,
      actual_revenue_q: 280000000, // 80%
      jumlah_closing_atap_bitumen: 4,
      jumlah_closing_waterproofing: 2,
      jumlah_closing_solar: 1,
      jumlah_closing_green_roof: 1,
      jumlah_closing_aksesoris: 1,
      conversion_rate: 40.9,
      
      persentase_cross_sell_aksesoris: 55.0,
      unit_solar_terjual: 2,
      adopsi_ecatalog_klien: 6,
      
      customer_satisfaction_score: 4.4,
      churn_rate_client: 4.5,
      average_closing_time: 28,
      
      pencapaian_target_persen: 80.0,
      status_elite_circle: false,
      estimasi_komisi_bulanan: 14000000,
      accumulated_annual_bonus: 14000000,
      
      last_updated: new Date(),
      created_at: new Date('2026-01-01'),
    },
  ];
};

export const generateLeaderboard = (kpiData: SalesKPI[]): LeaderboardEntry[] => {
  return kpiData
    .map((kpi, index) => {
      // Determine top module
      let topModule = '';
      const modules = [
        { name: 'E-Catalog', count: kpi.adopsi_ecatalog_klien },
        { name: 'Solar', count: kpi.unit_solar_terjual },
        { name: 'Aksesoris', count: Math.round(kpi.persentase_cross_sell_aksesoris / 10) },
      ];
      topModule = modules.reduce((a, b) => a.count > b.count ? a : b).name;
      
      // Generate badges
      const badges: string[] = [];
      if (kpi.status_elite_circle) badges.push('Elite Circle');
      if (kpi.customer_satisfaction_score >= 4.8) badges.push('Customer Champion');
      if (kpi.conversion_rate >= 50) badges.push('Conversion Master');
      if (kpi.total_kunjungan_toko >= 40) badges.push('Field Warrior');
      
      return {
        rank: index + 1,
        employee_id: kpi.employee_id,
        employee_name: kpi.employee_name,
        employee_avatar: kpi.employee_avatar,
        actual_revenue: kpi.actual_revenue_q,
        target_achieved_percent: kpi.pencapaian_target_persen,
        total_closings:
          kpi.jumlah_closing_atap_bitumen +
          kpi.jumlah_closing_waterproofing +
          kpi.jumlah_closing_solar +
          kpi.jumlah_closing_green_roof +
          kpi.jumlah_closing_aksesoris,
        top_module: topModule,
        badges,
        is_elite: kpi.status_elite_circle,
      };
    })
    .sort((a, b) => b.actual_revenue - a.actual_revenue)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export const generateKPISummary = (kpiData: SalesKPI[]): KPISummary => {
  const totalRevenue = kpiData.reduce((sum, kpi) => sum + kpi.actual_revenue_q, 0);
  const totalTarget = kpiData.reduce((sum, kpi) => sum + kpi.target_revenue_q, 0);
  const avgAchievement = kpiData.reduce((sum, kpi) => sum + kpi.pencapaian_target_persen, 0) / kpiData.length;
  const eliteMembers = kpiData.filter(kpi => kpi.status_elite_circle).length;
  
  const leaderboard = generateLeaderboard(kpiData);
  
  return {
    total_sales_team: kpiData.length,
    total_revenue_achieved: totalRevenue,
    total_revenue_target: totalTarget,
    average_achievement: avgAchievement,
    elite_circle_members: eliteMembers,
    top_performer: leaderboard[0] || null,
  };
};

// Export data
export const kpiData = generateKPIData();
export const leaderboardData = generateLeaderboard(kpiData);
export const kpiSummary = generateKPISummary(kpiData);
