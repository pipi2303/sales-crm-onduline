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
import { quotationsRepository, type QuotationStatus } from '@/services/quotationsRepository';
import { productsRepository } from '@/services/productsRepository';
import { clientsDummyData, salesRepresentativeDummyData, leadDummyData } from '@/utils/populateCRMData';
import type { SalesRep } from '@/types/salesRep';
import type { CommissionStatus } from '@/types/commission';

function getCurrentPeriod(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// Bab 45: tanggal relatif terhadap saat tombol ditekan (bukan hardcode
// absolut) supaya validUntil quotation contoh tetap masuk akal kapan pun
// fitur ini dipakai -- negatif = sudah lewat (dipakai utk quotation yang
// sengaja dibuat "expired").
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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

// Bab 45 (24 Sep 2026): "tambahkan data dummy di menu Quotation
// Management, data dummy yang relevan". Quotation Management sebelum ini
// tidak punya mekanisme dummy data sama sekali (tidak termasuk 5 yang
// digabung di Bab 39) -- KPI/pipeline-nya selalu kosong sampai user bikin
// quotation manual satu-satu. clientName di sini adalah nama KONTAK (PIC),
// clientCompany nama perusahaan -- lihat handleGenerateQuotation di
// QuotationManagement.tsx (contactPerson -> clientName, company ->
// clientCompany), BUKAN clientName = nama perusahaan. companyName dipakai
// untuk resolve clientId lewat clientByCompany (dibangun dari client yang
// sama yang dibuat di langkah 1 di bawah), supaya quotation-nya benar2
// terhubung ke Client record, bukan cuma teks bebas.
//
// items[].sku merujuk SKU asli dari katalog produk Onduline yang sudah
// di-seed lewat prisma/seed.ts (prisma/seedData/productCatalog.ts) --
// bukan produk fiktif -- supaya productId & unitPrice yang terpakai
// benar-benar produk & harga yang ada di Product Catalog live, dan
// relevan dengan kategori bisnis tiap client (toko bahan bangunan =
// stok reguler atap, kontraktor proyek = bitumen+green roof volume
// besar, resort = produk premium+solar, dst).
const SEED_QUOTATIONS: Array<{
  companyName: string;
  contactPerson: string;
  email: string;
  status: QuotationStatus;
  validUntil: string | null;
  additionalDiscountPercent?: number;
  notes: string;
  items: Array<{ sku: string; quantity: number }>;
}> = [
  {
    companyName: 'Toko Bangunan Makmur Jaya',
    contactPerson: 'Bapak Hendra Wijaya',
    email: 'info@makmurjayabangunan.co.id',
    status: 'approved',
    validUntil: daysFromNow(30),
    notes: 'Pemesanan stok reguler bulanan, sudah disetujui.',
    items: [
      { sku: 'ONDC-BRN', quantity: 500 }, // ONDULINE CLASSIC Brown
      { sku: 'NOKS-STD', quantity: 40 },  // NOK STANDAR
    ],
  },
  {
    companyName: 'Toko Material Sumber Rejeki',
    contactPerson: 'Ibu Ratna Kartika',
    email: 'sumberrejeki.material@gmail.com',
    status: 'sent',
    validUntil: daysFromNow(14),
    notes: 'Menunggu keputusan pemilik toko.',
    items: [
      { sku: 'ONDV-SR', quantity: 200 },  // ONDUVILLA Shaded Red
      { sku: 'VSTD-STD', quantity: 30 },  // VERGE STANDARD ONDULINE
    ],
  },
  {
    companyName: 'PT Kontraktor Bangun Persada',
    contactPerson: 'Bambang Sutrisno, S.T.',
    email: 'procurement@bangunpersada.co.id',
    status: 'approved',
    validUntil: daysFromNow(45),
    additionalDiscountPercent: 5,
    notes: 'Tahap pertama proyek atap gudang, sudah disetujui procurement.',
    items: [
      { sku: 'BITL-3MM', quantity: 300 }, // BITULINE 3mm
      { sku: 'ONDG-EXT', quantity: 150 }, // ONDUGREEN Extensive System
    ],
  },
  {
    companyName: 'PT Agro Lestari Nusantara',
    contactPerson: 'Hendra Gunawan',
    email: 'facility@agrolestari.co.id',
    status: 'draft',
    validUntil: null,
    notes: 'Estimasi awal untuk demo, menunggu hasil site visit.',
    items: [
      { sku: 'ONDC-BRN', quantity: 800 }, // ONDULINE CLASSIC Brown (gudang)
      { sku: 'ONDCT-739', quantity: 10 }, // ONDUCOAT 739 (waterproofing lantai/atap gudang)
    ],
  },
  {
    companyName: 'CV Rumah Idaman Bersama',
    contactPerson: 'Lisa Permata Sari',
    email: 'info@rumahidamanbersama.com',
    status: 'rejected',
    validUntil: daysFromNow(-3),
    notes: 'Client memilih vendor lain karena harga.',
    items: [
      { sku: 'ONDT-TRC', quantity: 120 }, // ONDULINE TILE Terracotta
      { sku: 'SKYL-STD', quantity: 4 },   // SKYLIGHT
    ],
  },
  {
    companyName: 'Resort & Villa Ciwidey',
    contactPerson: 'Ir. Johanes Surya',
    email: 'facility@villaciwidey.co.id',
    status: 'sent',
    validUntil: daysFromNow(21),
    notes: 'Proposal premium villa + solar rooftop, masih tahap negosiasi.',
    items: [
      { sku: 'OVCT-STD', quantity: 60 },  // ONDUVILLA CLEAR TILE
      { sku: 'OSPH-550', quantity: 20 },  // ONDUSOLAR PRO HC 550Wp
    ],
  },
  {
    companyName: 'Toko Material Sumber Rejeki',
    contactPerson: 'Ibu Ratna Kartika',
    email: 'sumberrejeki.material@gmail.com',
    status: 'expired',
    validUntil: '2026-08-01',
    notes: 'Penawaran awal sebelum revisi harga, sudah lewat masa berlaku.',
    items: [
      { sku: 'FLSB-STD', quantity: 40 },  // FLASHING BAND Self Adhesive
      { sku: 'CVFL-STD', quantity: 100 }, // CORRUGATED VENTILATED FILLER
    ],
  },
  {
    companyName: 'Dinas PUPR Kabupaten Ciamis',
    contactPerson: 'Ir. Suparman, M.T.',
    email: 'pengadaan@pupr.ciamiskab.go.id',
    status: 'cancelled',
    validUntil: daysFromNow(-10),
    notes: 'Retrofit atap pasar rakyat, proyek dibatalkan karena anggaran dialihkan ke tender ulang.',
    items: [
      { sku: 'ONDT-TRC', quantity: 600 }, // ONDULINE TILE Terracotta
      { sku: 'VSTD-STD', quantity: 80 },  // VERGE STANDARD ONDULINE
    ],
  },
  {
    companyName: 'PT Retail Modern Indonesia',
    contactPerson: 'Sinta Marlina',
    email: 'procurement@retailmodern.co.id',
    status: 'sent',
    validUntil: daysFromNow(18),
    additionalDiscountPercent: 3,
    notes: 'Renovasi atap 8 cabang toko ritel sekaligus, menunggu approval pusat.',
    items: [
      { sku: 'ONDC-BRN', quantity: 950 }, // ONDULINE CLASSIC Brown
      { sku: 'NOKS-STD', quantity: 60 },  // NOK STANDAR
    ],
  },
  {
    companyName: 'Yayasan Pendidikan Al-Hikmah',
    contactPerson: 'Drs. Wahyu Nugroho',
    email: 'sarpras@alhikmah-edu.sch.id',
    status: 'draft',
    validUntil: null,
    notes: 'Estimasi awal gedung sekolah baru 3 lantai, menunggu keputusan yayasan.',
    items: [
      { sku: 'ONDT-TRC', quantity: 250 }, // ONDULINE TILE Terracotta
      { sku: 'SKYL-STD', quantity: 12 },  // SKYLIGHT (pencahayaan alami ruang kelas)
    ],
  },
  {
    companyName: 'Pabrik Tekstil Sentosa',
    contactPerson: 'Feri Kurniawan',
    email: 'purchasing@tekstilsentosa.co.id',
    status: 'approved',
    validUntil: daysFromNow(60),
    additionalDiscountPercent: 8,
    notes: 'Kontrak volume besar renovasi atap pabrik, sudah disetujui direksi.',
    items: [
      { sku: 'BITL-3MM', quantity: 1200 }, // BITULINE 3mm
      { sku: 'CVFL-STD', quantity: 300 },  // CORRUGATED VENTILATED FILLER
    ],
  },
  {
    companyName: 'PT Grahamas Land Development',
    contactPerson: 'Anita Puspitasari',
    email: 'procurement@grahamasland.co.id',
    status: 'sent',
    validUntil: daysFromNow(25),
    notes: 'Pasokan atap untuk cluster perumahan tahap 1 (50 unit rumah).',
    items: [
      { sku: 'ONDV-SR', quantity: 750 },  // ONDUVILLA Shaded Red
      { sku: 'VSTD-STD', quantity: 100 }, // VERGE STANDARD ONDULINE
    ],
  },
  {
    companyName: 'Bengkel & Gudang UMKM Barokah',
    contactPerson: 'Pak Slamet Riyadi',
    email: 'bengkelbarokah@gmail.com',
    status: 'draft',
    validUntil: null,
    notes: 'Estimasi renovasi atap bengkel kecil, masih tahap tanya-tanya harga.',
    items: [
      { sku: 'ONDC-BRN', quantity: 60 }, // ONDULINE CLASSIC Brown
      { sku: 'NOKS-STD', quantity: 8 },  // NOK STANDAR
    ],
  },
];

export interface LoadAllDummyDataResult {
  clients: number;
  employees: number;
  territories: number;
  leads: number;
  salesReps: number;
  commissions: number;
  quotations: number;
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
    quotations: 0,
    errors: [],
  };

  // 1. Client (dari SalesTeam.tsx) -- juga membangun clientByCompany
  // (nama_entitas -> id client yang baru dibuat) supaya step Quotation
  // (Bab 45) di bawah bisa link ke Client record sungguhan, bukan cuma
  // teks nama perusahaan lepas.
  const clientByCompany = new Map<string, { id: string }>();
  for (const seed of clientsDummyData) {
    const { id: _localId, ...payload } = seed as any;
    const res = await clientsRepository.create(payload);
    if (res.success && res.data) {
      result.clients += 1;
      clientByCompany.set(res.data.nama_entitas, { id: res.data.id });
    } else {
      result.errors.push(`Client "${seed.nama_entitas}": ${res.error}`);
    }
  }
  // Fallback sama seperti Territory/SalesRep di bawah: kalau pembuatan
  // client di atas gagal semua tapi datanya sudah ada dari sebelumnya,
  // tetap resolve by name supaya Quotation tetap bisa dapat clientId.
  if (clientByCompany.size === 0) {
    const existingClients = await clientsRepository.getAll();
    if (existingClients.success && existingClients.data) {
      for (const c of existingClients.data) clientByCompany.set(c.nama_entitas, { id: c.id });
    }
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

  // 7. Quotation (Bab 45) -- butuh Client (langkah 1, resolve via
  // clientByCompany) + Product katalog asli (fetch read-only, BUKAN
  // dibuat di sini -- Product sudah di-seed lewat prisma/seed.ts, lihat
  // catatan di SEED_QUOTATIONS di atas).
  const productsRes = await productsRepository.getAll();
  const productBySku = new Map<string, { id: string; name: string; price: number }>();
  if (productsRes.success && productsRes.data) {
    for (const p of productsRes.data) productBySku.set(p.sku, { id: p.id, name: p.name, price: p.price });
  }
  for (const seed of SEED_QUOTATIONS) {
    const items = seed.items
      .map((it) => {
        const product = productBySku.get(it.sku);
        if (!product) return null;
        return { productId: product.id, productName: product.name, quantity: it.quantity, unitPrice: product.price };
      })
      .filter((it): it is NonNullable<typeof it> => it !== null);
    if (items.length === 0) {
      result.errors.push(`Quotation "${seed.companyName}": produk (SKU) tidak ditemukan di katalog, lewati`);
      continue;
    }
    const client = clientByCompany.get(seed.companyName);
    const res = await quotationsRepository.create({
      clientId: client?.id ?? null,
      clientName: seed.contactPerson,
      clientCompany: seed.companyName,
      clientEmail: seed.email,
      additionalDiscountPercent: seed.additionalDiscountPercent ?? 0,
      status: seed.status,
      validUntil: seed.validUntil,
      notes: seed.notes,
      items,
    });
    if (res.success) result.quotations += 1;
    else result.errors.push(`Quotation "${seed.companyName}": ${res.error}`);
  }

  return result;
}
