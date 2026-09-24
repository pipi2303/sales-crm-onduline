// Bab 39 (24 Sep 2026): "gabungkan semua button dan fungsi load dummy
// data, jadi tombol load dummy data hanya ada di Home, setelah ditekan
// maka semua data yang ada akan muncul".
//
// Sebelum putaran ini, "Load Dummy Data" tersebar di 5 tempat berbeda:
// tombol di SalesTeam.tsx (Client), SalesRepresentative.tsx (Employee),
// TerritoryManagement.tsx (Territory + PerformanceTarget),
// LeadManagement.tsx (Lead, Bab 37), plus auto-seed-diam-diam di dalam
// CommissionCalculator.tsx's loadData() (SalesRep + CommissionRecord +
// PerformanceTarget per rep) yang jalan otomatis begitu layar itu
// dibuka dan datanya kosong -- bukan tombol, tapi fungsi yang sama
// sifatnya. Semua dipindah ke SATU fungsi di sini, dipanggil dari SATU
// tombol di Home.tsx. Tombol/fungsi asalnya sudah dihapus dari kelima
// layar itu (lihat komentar Bab 39 di masing-masing file).
//
// Urutan di bawah ini SENGAJA berurutan (bukan Promise.all) karena ada
// dependensi data lintas kategori:
// - Lead butuh Territory sudah ada dulu (territoryId di-resolve dari
//   nama wilayah).
// - CommissionRecord + PerformanceTarget-per-rep butuh SalesRep sudah
//   ada dulu (salesRepId di-resolve dari nama sales).
//
// Seperti tombol-tombol asalnya, fungsi ini TIDAK idempotent -- setiap
// panggilan membuat record baru lewat repository.create() tanpa cek
// duplikat (kecuali PerformanceTarget per rep+period, yang memang sudah
// dicek "already" sejak awal di CommissionCalculator.tsx). Ini bukan
// regresi: sifat yang sama persis sudah ada di kelima sumber aslinya
// sebelum digabung -- mengklik tombol dummy data dua kali di halaman
// mana pun sebelum ini juga sudah membuat data ganda. Menekan tombol
// gabungan ini dua kali akan menggandakan SEMUA kategori sekaligus,
// bukan cuma satu -- catatan ini didokumentasikan di MEMORY.md, bukan
// diperbaiki di putaran ini (di luar scope permintaan konsolidasi).

import { clientsRepository } from '@/services/clientsRepository';
import { employeesRepository } from '@/services/employeesRepository';
import { territoriesRepository } from '@/services/territoriesRepository';
import { performanceTargetsRepository } from '@/services/performanceTargetsRepository';
import { leadsRepository } from '@/services/leadsRepository';
import { salesRepsRepository } from '@/services/salesRepsRepository';
import { commissionsRepository } from '@/services/commissionsRepository';
import { clientsDummyData, salesRepresentativeDummyData, leadDummyData } from '@/utils/populateCRMData';
import type { SalesRep } from '@/types/salesRep';
import type { CommissionStatus } from '@/types/commission';

function getCurrentPeriod(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// Dipindah dari TerritoryManagement.tsx (Bab 32/33) -- 4 wilayah contoh
// yang sudah lama dipakai layar itu, sekarang jadi bagian dari alur
// gabungan.
const SEED_TERRITORIES = [
  { name: 'Jakarta Pusat', region: 'DKI Jakarta', assignedTo: 'Budi Santoso', coverage: 85, revenue: 350000000, target: 300000000 },
  { name: 'Jakarta Selatan', region: 'DKI Jakarta', assignedTo: 'Ani Wijaya', coverage: 78, revenue: 280000000, target: 300000000 },
  { name: 'Bandung', region: 'Jawa Barat', assignedTo: 'Dewi Kartika', coverage: 92, revenue: 520000000, target: 400000000 },
  { name: 'Surabaya', region: 'Jawa Timur', assignedTo: 'Eko Prasetyo', coverage: 65, revenue: 185000000, target: 250000000 },
];

// Dipindah dari CommissionCalculator.tsx -- SalesRep contoh (model
// SalesRep, TERPISAH dari Employee-nya SalesRepresentative.tsx).
const SEED_REPS: Array<Omit<SalesRep, 'id' | 'createdAt'>> = [
  { name: 'Budi Santoso', email: 'budi.santoso@gmail.com', role: 'Sales Executive' },
  { name: 'Ani Wijaya', email: 'ani.wijaya@gmail.com', role: 'Sales Executive' },
  { name: 'Dewi Kartika', email: 'dewi.kartika@gmail.com', role: 'Senior Sales Executive' },
  { name: 'Eko Prasetyo', email: 'eko.prasetyo@gmail.com', role: 'Sales Executive' },
];

// Dipindah dari CommissionCalculator.tsx -- baseCommission-nya sudah
// dihitung ulang dari rumus tier progresif sejak Bab 34, lihat komentar
// aslinya (dipindah, tidak diubah nilainya).
const SEED_COMMISSIONS = [
  { salesPersonName: 'Budi Santoso', periodIso: '2024-02-01', target: 300000000, totalSales: 350000000, baseCommission: 12750000, bonuses: 10000000, totalCommission: 22750000, status: 'pending' as CommissionStatus, deals: 3 },
  { salesPersonName: 'Ani Wijaya', periodIso: '2024-02-01', target: 300000000, totalSales: 280000000, baseCommission: 9250000, bonuses: 7800000, totalCommission: 17050000, status: 'approved' as CommissionStatus, deals: 4 },
  { salesPersonName: 'Dewi Kartika', periodIso: '2024-02-01', target: 300000000, totalSales: 520000000, baseCommission: 21650000, bonuses: 25000000, totalCommission: 46650000, status: 'approved' as CommissionStatus, deals: 5 },
  { salesPersonName: 'Eko Prasetyo', periodIso: '2024-02-01', target: 300000000, totalSales: 185000000, baseCommission: 5475000, bonuses: 0, totalCommission: 5475000, status: 'pending' as CommissionStatus, deals: 2 },
  { salesPersonName: 'Budi Santoso', periodIso: '2024-01-01', target: 300000000, totalSales: 420000000, baseCommission: 16250000, bonuses: 15000000, totalCommission: 31250000, status: 'paid' as CommissionStatus, deals: 6, paymentDate: '2024-02-05' },
];

export interface LoadAllDummyDataResult {
  clients: number;
  employees: number;
  territories: number;
  leads: number;
  salesReps: number;
  commissions: number;
  errors: string[];
}

export async function loadAllDummyData(): Promise<LoadAllDummyDataResult> {
  const result: LoadAllDummyDataResult = {
    clients: 0,
    employees: 0,
    territories: 0,
    leads: 0,
    salesReps: 0,
    commissions: 0,
    errors: [],
  };

  // 1. Client (dari SalesTeam.tsx)
  for (const seed of clientsDummyData) {
    const { id: _localId, ...payload } = seed as any;
    const res = await clientsRepository.create(payload);
    if (res.success) result.clients += 1;
    else result.errors.push(`Client "${seed.nama_entitas}": ${res.error}`);
  }

  // 2. Employee (dari SalesRepresentative.tsx)
  for (const seed of salesRepresentativeDummyData) {
    const { id: _localId, ...payload } = seed as any;
    const res = await employeesRepository.create(payload);
    if (res.success) result.employees += 1;
    else result.errors.push(`Karyawan "${seed.nama_lengkap}": ${res.error}`);
  }

  // 3. Territory + PerformanceTarget (dari TerritoryManagement.tsx)
  const period = getCurrentPeriod();
  const territoryIdByName = new Map<string, string>();
  for (const seed of SEED_TERRITORIES) {
    const created = await territoriesRepository.create({
      name: seed.name,
      region: seed.region,
      assignedTo: seed.assignedTo,
      coverage: seed.coverage,
    });
    if (created.success && created.data) {
      result.territories += 1;
      territoryIdByName.set(seed.name, created.data.id);
      await performanceTargetsRepository.create({
        territoryId: created.data.id,
        period,
        target: seed.target,
        actual: seed.revenue,
      } as any);
    } else {
      result.errors.push(`Wilayah "${seed.name}": ${created.error}`);
    }
  }
  // Fallback: kalau pembuatan wilayah di atas gagal semua (mis. role
  // user ini tidak diizinkan backend, lihat TERRITORY_MANAGE_ROLES di
  // TerritoryManagement.tsx) tapi wilayahnya sudah ada dari sebelumnya,
  // tetap resolve by name supaya Lead di bawah bisa dapat territoryId.
  if (territoryIdByName.size === 0) {
    const existing = await territoriesRepository.getAll();
    if (existing.success && existing.data) {
      for (const t of existing.data) territoryIdByName.set(t.name, t.id);
    }
  }

  // 4. Lead (dari LeadManagement.tsx, Bab 37)
  for (const seed of leadDummyData) {
    const { territoryName, ...rest } = seed;
    const territoryId = territoryIdByName.get(territoryName) ?? null;
    const res = await leadsRepository.create({ ...rest, territoryId });
    if (res.success) result.leads += 1;
    else result.errors.push(`Lead "${seed.company}": ${res.error}`);
  }

  // 5. SalesRep (dari CommissionCalculator.tsx's auto-seed lama)
  const repIdByName = new Map<string, string>();
  for (const seed of SEED_REPS) {
    const res = await salesRepsRepository.create(seed);
    if (res.success && res.data) {
      result.salesReps += 1;
      repIdByName.set(seed.name, res.data.id);
    } else {
      result.errors.push(`Sales rep "${seed.name}": ${res.error}`);
    }
  }
  if (repIdByName.size === 0) {
    const existing = await salesRepsRepository.getAll();
    if (existing.success && existing.data) {
      for (const r of existing.data) repIdByName.set(r.name, r.id);
    }
  }

  // 6. CommissionRecord + PerformanceTarget per rep (dari
  // CommissionCalculator.tsx's auto-seed lama)
  for (const seed of SEED_COMMISSIONS) {
    const repId = repIdByName.get(seed.salesPersonName);
    if (!repId) {
      result.errors.push(`Komisi "${seed.salesPersonName}": sales rep tidak ditemukan`);
      continue;
    }
    const existingTargets = await performanceTargetsRepository.getForEntity({ salesRepId: repId } as any);
    const already = (existingTargets.data || []).find((t: any) => t.period === seed.periodIso);
    if (!already) {
      await performanceTargetsRepository.create({
        salesRepId: repId,
        period: seed.periodIso,
        target: seed.target,
        actual: seed.totalSales,
      } as any);
    }
    const res = await commissionsRepository.create({
      salesRepId: repId,
      period: seed.periodIso,
      baseCommission: seed.baseCommission,
      bonuses: seed.bonuses,
      totalCommission: seed.totalCommission,
      status: seed.status,
      deals: seed.deals,
      paymentDate: seed.paymentDate,
    });
    if (res.success) result.commissions += 1;
    else result.errors.push(`Komisi "${seed.salesPersonName}": ${res.error}`);
  }

  return result;
}
