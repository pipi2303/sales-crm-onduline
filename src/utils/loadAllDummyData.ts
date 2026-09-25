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
import { contractsRepository } from '@/services/contractsRepository';
import type { Contract as ContractType } from '@/app/data/dummyData';
import { opportunitiesRepository } from '@/services/opportunitiesRepository';
import { discountApprovalsRepository } from '@/services/discountApprovalsRepository';
import { tasksRepository } from '@/services/tasksRepository';
import type { Task } from '@/types/task';
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

// Bab 49: Contract (menu Contract) -- berbeda dari Quotation, Contract
// TIDAK punya auto-generate contractNumber di server (lihat
// api/handler.ts handleContracts: contractNumber wajib diisi client),
// jadi nomor kontrak di-hardcode di sini seperti quoteNumber manual.
// `product` di model Contract adalah teks bebas (bukan FK ke Product
// Catalog seperti items Quotation), startDate/endDate relatif terhadap
// saat tombol ditekan (pola sama seperti validUntil Quotation di atas)
// supaya status draft/pending/active/expired/terminated tetap masuk
// akal kapan pun dipakai. Tidak semua company di sini overlap dengan
// SEED_QUOTATIONS -- Contract merepresentasikan tahap yang berbeda
// (kontrak sudah/sedang ditandatangani), bukan cerminan 1:1 dari
// quotation yang mana yang approved.
const SEED_CONTRACTS: Array<{
  contractNumber: string;
  clientName: string;
  company: string;
  product: string;
  value: number;
  startDateDays: number;
  endDateDays: number;
  status: ContractType['status'];
  signedBy: string;
  salesPerson: string;
}> = [
  {
    contractNumber: 'CTR-2026-0001',
    clientName: 'Bapak Hendra Wijaya',
    company: 'Toko Bangunan Makmur Jaya',
    product: 'Distribusi Atap ONDULINE CLASSIC & Aksesoris (kontrak tahunan)',
    value: 25000000,
    startDateDays: -180,
    endDateDays: 185,
    status: 'active',
    signedBy: 'Hendra Wijaya',
    salesPerson: 'Budi Santoso',
  },
  {
    contractNumber: 'CTR-2026-0002',
    clientName: 'Bambang Sutrisno, S.T.',
    company: 'PT Kontraktor Bangun Persada',
    product: 'Proyek Atap Gudang Industri - BITULINE & ONDUGREEN',
    value: 185000000,
    startDateDays: -60,
    endDateDays: 120,
    status: 'active',
    signedBy: 'Bambang Sutrisno',
    salesPerson: 'Dewi Kartika',
  },
  {
    contractNumber: 'CTR-2026-0003',
    clientName: 'Feri Kurniawan',
    company: 'Pabrik Tekstil Sentosa',
    product: 'Renovasi Atap Pabrik Tekstil - BITULINE Volume Besar',
    value: 220000000,
    startDateDays: 0,
    endDateDays: 365,
    status: 'pending',
    signedBy: '',
    salesPerson: 'Eko Prasetyo',
  },
  {
    contractNumber: 'CTR-2026-0004',
    clientName: 'Sinta Marlina',
    company: 'PT Retail Modern Indonesia',
    product: 'Renovasi Atap 8 Cabang Ritel - ONDULINE CLASSIC',
    value: 65000000,
    startDateDays: 0,
    endDateDays: 270,
    status: 'pending',
    signedBy: '',
    salesPerson: 'Ani Wijaya',
  },
  {
    contractNumber: 'CTR-2026-0005',
    clientName: 'Ir. Johanes Surya',
    company: 'Resort & Villa Ciwidey',
    product: 'Instalasi Atap Premium & Panel Surya ONDUSOLAR',
    value: 145000000,
    startDateDays: 30,
    endDateDays: 395,
    status: 'draft',
    signedBy: '',
    salesPerson: 'Dewi Kartika',
  },
  {
    contractNumber: 'CTR-2026-0006',
    clientName: 'Anita Puspitasari',
    company: 'PT Grahamas Land Development',
    product: 'Pasokan Atap Cluster Perumahan Tahap 1 (50 unit)',
    value: 95000000,
    startDateDays: 20,
    endDateDays: 200,
    status: 'draft',
    signedBy: '',
    salesPerson: 'Budi Santoso',
  },
  {
    contractNumber: 'CTR-2025-0042',
    clientName: 'Ibu Ratna Kartika',
    company: 'Toko Material Sumber Rejeki',
    product: 'Kontrak Pasokan Rutin Tahunan',
    value: 18000000,
    startDateDays: -420,
    endDateDays: -55,
    status: 'expired',
    signedBy: 'Ratna Kartika',
    salesPerson: 'Ani Wijaya',
  },
  {
    contractNumber: 'CTR-2025-0031',
    clientName: 'Pak Wijaya',
    company: 'CV Wijaya Konstruksi',
    product: 'Renovasi Atap Ruko - ONDULINE TILE',
    value: 42000000,
    startDateDays: -240,
    endDateDays: -90,
    status: 'terminated',
    signedBy: 'Wijaya',
    salesPerson: 'Eko Prasetyo',
  },
];

// Bab 50: Opportunity -- DIPAKAI LANGSUNG oleh KPI dashboard Home.tsx
// (revenueYTD/MTD dari opp.totalValue yang WON, winRate dari won/(won+lost))
// -- lihat komentar "Fase A/B seed data" di Home.tsx. Menambah data di sini
// SENGAJA akan mengubah angka KPI Home juga, dikonfirmasi dengan user
// sebelum implementasi (beda dari Quotation/Contract yang keduanya
// self-contained di menunya sendiri). closeDateDays relatif terhadap
// saat tombol ditekan, sama pola dengan validUntil/startDateDays di atas.
const SEED_OPPORTUNITIES: Array<{
  name: string;
  company: string;
  contactPerson: string;
  totalValue: number;
  probability: number;
  closeDateDays: number;
  stage: 'prospecting' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  status: 'open' | 'won' | 'lost';
  source: string;
  description: string;
  closeReason?: string;
  ownerName: string;
}> = [
  {
    name: 'Distribusi Atap ONDULINE CLASSIC - Makmur Jaya',
    company: 'Toko Bangunan Makmur Jaya',
    contactPerson: 'Bapak Hendra Wijaya',
    totalValue: 25000000,
    probability: 100,
    closeDateDays: -175,
    stage: 'closed-won',
    status: 'won',
    source: 'Referral',
    description: 'Kontrak distribusi rutin tahunan, sudah ditandatangani.',
    closeReason: 'Harga kompetitif dan hubungan jangka panjang dengan distributor.',
    ownerName: 'Budi Santoso',
  },
  {
    name: 'Proyek Atap Gudang Industri - Bangun Persada',
    company: 'PT Kontraktor Bangun Persada',
    contactPerson: 'Bambang Sutrisno, S.T.',
    totalValue: 185000000,
    probability: 100,
    closeDateDays: -55,
    stage: 'closed-won',
    status: 'won',
    source: 'Tender',
    description: 'Proyek atap gudang industri BITULINE & ONDUGREEN, menang tender.',
    closeReason: 'Spesifikasi teknis unggul dan track record proyek serupa.',
    ownerName: 'Dewi Kartika',
  },
  {
    name: 'Renovasi Atap Pabrik Tekstil Sentosa',
    company: 'Pabrik Tekstil Sentosa',
    contactPerson: 'Feri Kurniawan',
    totalValue: 220000000,
    probability: 70,
    closeDateDays: 15,
    stage: 'negotiation',
    status: 'open',
    source: 'Cold Outreach',
    description: 'Negosiasi harga akhir untuk kontrak volume besar industri.',
    ownerName: 'Eko Prasetyo',
  },
  {
    name: 'Renovasi Atap 8 Cabang - Retail Modern',
    company: 'PT Retail Modern Indonesia',
    contactPerson: 'Sinta Marlina',
    totalValue: 65000000,
    probability: 55,
    closeDateDays: 25,
    stage: 'proposal',
    status: 'open',
    source: 'Website Inquiry',
    description: 'Proposal renovasi atap 8 cabang ritel sedang direview procurement pusat.',
    ownerName: 'Ani Wijaya',
  },
  {
    name: 'Atap Premium & Solar - Resort Ciwidey',
    company: 'Resort & Villa Ciwidey',
    contactPerson: 'Ir. Johanes Surya',
    totalValue: 145000000,
    probability: 40,
    closeDateDays: 40,
    stage: 'proposal',
    status: 'open',
    source: 'Referral',
    description: 'Proposal atap premium + panel surya, klien masih membandingkan vendor.',
    ownerName: 'Dewi Kartika',
  },
  {
    name: 'Pasokan Atap Cluster Perumahan - Grahamas Land',
    company: 'PT Grahamas Land Development',
    contactPerson: 'Anita Puspitasari',
    totalValue: 95000000,
    probability: 25,
    closeDateDays: 60,
    stage: 'prospecting',
    status: 'open',
    source: 'Trade Show',
    description: 'Tahap awal eksplorasi kebutuhan atap untuk cluster perumahan tahap 1.',
    ownerName: 'Budi Santoso',
  },
  {
    name: 'Retrofit Atap Pasar Rakyat - Dinas PUPR Ciamis',
    company: 'Dinas PUPR Kabupaten Ciamis',
    contactPerson: 'Ir. Suparman, M.T.',
    totalValue: 78000000,
    probability: 0,
    closeDateDays: -12,
    stage: 'closed-lost',
    status: 'lost',
    source: 'Tender',
    description: 'Tender retrofit atap pasar rakyat, proyek dibatalkan oleh dinas.',
    closeReason: 'Anggaran dialihkan ke tender ulang tahun depan.',
    ownerName: 'Eko Prasetyo',
  },
  {
    name: 'Renovasi Atap Ruko - CV Wijaya Konstruksi',
    company: 'CV Wijaya Konstruksi',
    contactPerson: 'Pak Wijaya',
    totalValue: 42000000,
    probability: 0,
    closeDateDays: -95,
    stage: 'closed-lost',
    status: 'lost',
    source: 'Referral',
    description: 'Deal sempat berjalan, klien membatalkan karena masalah internal.',
    closeReason: 'Klien mengalami restrukturisasi internal dan menunda semua proyek.',
    ownerName: 'Eko Prasetyo',
  },
];

// Bab 50: Discount Approval. discountPercent MENENTUKAN level & status
// approval SECARA OTOMATIS di server (lihat discountLevelForPercent di
// api/handler.ts: <=10% level 1 self-approved, <=20% level 2, <=30% level
// 3, >30% level 4) -- tidak bisa diset manual saat create(). Untuk 2 entri
// yang designnya "sudah diputuskan" (approved/rejected di atas level 1),
// step tambahan memanggil .decide() setelah create() -- best-effort, sama
// seperti fallback role-gated lain di file ini (mis. Territory): kalau
// user yang menekan tombol tidak punya role approver yang dibutuhkan,
// request itu tetap tercipta sebagai 'pending', tidak dianggap error fatal.
const SEED_DISCOUNT_REQUESTS: Array<{
  clientName: string;
  productName: string;
  originalPrice: number;
  discountPercent: number;
  reason: string;
  region: string;
  originalMargin: number;
  proposedMargin: number;
  decision?: 'approve' | 'reject';
  decisionComment?: string;
}> = [
  {
    clientName: 'Toko Bangunan Makmur Jaya',
    productName: 'ONDULINE CLASSIC Brown',
    originalPrice: 25000000,
    discountPercent: 8,
    reason: 'Pembelian volume besar untuk stok reguler bulanan, pelanggan loyal jangka panjang.',
    region: 'Jawa Barat',
    originalMargin: 42,
    proposedMargin: 38,
  },
  {
    clientName: 'PT Kontraktor Bangun Persada',
    productName: 'BITULINE 3mm',
    originalPrice: 165000000,
    discountPercent: 15,
    reason: 'Proyek strategis multi-tahun, kompetitor menawarkan harga lebih rendah.',
    region: 'Jawa Barat',
    originalMargin: 38,
    proposedMargin: 30,
  },
  {
    clientName: 'Pabrik Tekstil Sentosa',
    productName: 'BITULINE 3mm',
    originalPrice: 210000000,
    discountPercent: 22,
    reason: 'Kontrak volume industri besar, klien minta harga khusus untuk komitmen jangka panjang.',
    region: 'Jawa Tengah',
    originalMargin: 40,
    proposedMargin: 26,
  },
  {
    clientName: 'PT Retail Modern Indonesia',
    productName: 'ONDULINE CLASSIC Brown',
    originalPrice: 62000000,
    discountPercent: 12,
    reason: 'Renovasi 8 cabang sekaligus, klien minta harga grosir.',
    region: 'DKI Jakarta',
    originalMargin: 40,
    proposedMargin: 33,
    decision: 'reject',
    decisionComment: 'Margin terlalu tipis untuk kuantitas ini di luar musim ramai.',
  },
  {
    clientName: 'Resort & Villa Ciwidey',
    productName: 'ONDUSOLAR PRO HC 550Wp',
    originalPrice: 76000000,
    discountPercent: 18,
    reason: 'Proyek premium, klien membandingkan dengan vendor solar lain.',
    region: 'Jawa Barat',
    originalMargin: 30,
    proposedMargin: 20,
    decision: 'approve',
    decisionComment: 'Disetujui -- klien strategis untuk portofolio produk hijau.',
  },
  {
    clientName: 'PT Grahamas Land Development',
    productName: 'ONDUVILLA Shaded Red',
    originalPrice: 66750000,
    discountPercent: 35,
    reason: 'Volume sangat besar untuk cluster perumahan 50 unit, butuh persetujuan tertinggi.',
    region: 'Jawa Barat',
    originalMargin: 42,
    proposedMargin: 15,
  },
];

// Bab 50: Task -- dipindah dari TaskManagement.tsx yang sebelumnya
// auto-seed sendiri (silently create 7 SEED_TASKS begitu tabel Task
// kosong saat komponen dibuka, TIDAK lewat tombol ini) -- pola lama yang
// sama persis dengan yang sudah dihapus dari CommissionCalculator.tsx di
// Bab 39. Konten lama (PT Maju Jaya, PT Global Solutions, dst -- generik,
// bukan konteks Onduline, tanggal hardcode Feb 2024) diganti total dengan
// task yang relevan & tanggal relatif, ditautkan ke company/konteks yang
// sama dengan Quotation/Contract/Opportunity di atas.
const SEED_TASKS: Array<Omit<Task, 'id' | 'createdDate' | 'dueDate'> & { dueDateDays: number }> = [
  {
    title: 'Follow up penawaran - Pabrik Tekstil Sentosa',
    description: 'Follow up hasil negosiasi diskon 22% untuk kontrak BITULINE volume besar.',
    status: 'in-progress',
    priority: 'urgent',
    type: 'call',
    dueDateDays: 3,
    assignedTo: 'Eko Prasetyo',
    createdBy: 'Eko Prasetyo',
    category: 'Sales Follow-up',
    relatedTo: 'Pabrik Tekstil Sentosa',
    tags: ['Negosiasi', 'Industri', 'High-Value'],
  },
  {
    title: 'Kunjungan survey lokasi - Resort & Villa Ciwidey',
    description: 'Survey lokasi atap villa untuk instalasi ONDUSOLAR & ONDUVILLA CLEAR TILE.',
    status: 'todo',
    priority: 'high',
    type: 'visit',
    dueDateDays: 5,
    assignedTo: 'Dewi Kartika',
    createdBy: 'Dewi Kartika',
    category: 'Site Visit',
    relatedTo: 'Resort & Villa Ciwidey',
    tags: ['Survey', 'Premium', 'Solar'],
  },
  {
    title: 'Kirim proposal renovasi 8 cabang - Retail Modern Indonesia',
    description: 'Finalisasi dan kirim proposal renovasi atap 8 cabang ke procurement pusat.',
    status: 'todo',
    priority: 'high',
    type: 'email',
    dueDateDays: 2,
    assignedTo: 'Ani Wijaya',
    createdBy: 'Ani Wijaya',
    category: 'Sales Follow-up',
    relatedTo: 'PT Retail Modern Indonesia',
    tags: ['Proposal', 'Retail', 'Multi-cabang'],
  },
  {
    title: 'Tanda tangan kontrak - Bangun Persada',
    description: 'Koordinasi jadwal tanda tangan kontrak proyek gudang industri.',
    status: 'completed',
    priority: 'urgent',
    type: 'visit',
    dueDateDays: -10,
    assignedTo: 'Dewi Kartika',
    createdBy: 'Dewi Kartika',
    category: 'Contract',
    relatedTo: 'PT Kontraktor Bangun Persada',
    tags: ['Kontrak', 'Kontraktor', 'Signed'],
  },
  {
    title: 'Update data CRM klien toko & distributor',
    description: 'Bersihkan dan update data kontak seluruh klien toko bangunan aktif.',
    status: 'in-progress',
    priority: 'low',
    type: 'other',
    dueDateDays: 7,
    assignedTo: 'Ani Wijaya',
    createdBy: 'Ani Wijaya',
    category: 'Admin',
    tags: ['CRM', 'Data Quality'],
  },
  {
    title: 'Presentasi eksplorasi kebutuhan - Grahamas Land Development',
    description: 'Presentasi awal opsi atap untuk cluster perumahan tahap 1 (50 unit).',
    status: 'todo',
    priority: 'medium',
    type: 'visit',
    dueDateDays: 10,
    assignedTo: 'Budi Santoso',
    createdBy: 'Budi Santoso',
    category: 'Site Visit',
    relatedTo: 'PT Grahamas Land Development',
    tags: ['Prospecting', 'Developer', 'Perumahan'],
  },
  {
    title: 'Kirim survey kepuasan pelanggan Q3',
    description: 'Kirim survey kepuasan ke seluruh klien aktif untuk evaluasi kuartal ini.',
    status: 'todo',
    priority: 'low',
    type: 'email',
    dueDateDays: 14,
    assignedTo: 'Ani Wijaya',
    createdBy: 'Sarah Manager',
    category: 'Customer Success',
    tags: ['Survey', 'Feedback'],
  },
  {
    title: 'Review pengajuan diskon pending Level 3 & 4',
    description: 'Review pengajuan diskon Pabrik Tekstil Sentosa dan Grahamas Land yang masih pending.',
    status: 'todo',
    priority: 'high',
    type: 'other',
    dueDateDays: 4,
    assignedTo: 'Sarah Manager',
    createdBy: 'Sarah Manager',
    category: 'Approvals',
    tags: ['Approval', 'Diskon', 'Management'],
  },
  {
    title: 'Renovasi atap gudang - PT Agro Lestari Nusantara',
    description: 'Follow up hasil site visit untuk estimasi renovasi atap gudang agro.',
    status: 'todo',
    priority: 'medium',
    type: 'call',
    dueDateDays: 6,
    assignedTo: 'Budi Santoso',
    createdBy: 'Budi Santoso',
    category: 'Sales Follow-up',
    relatedTo: 'PT Agro Lestari Nusantara',
    tags: ['Estimasi', 'Gudang'],
  },
  {
    title: 'Kunjungan rutin - Toko Material Sumber Rejeki',
    description: 'Kunjungan rutin cek stok & penawaran ulang setelah quotation lama expired.',
    status: 'todo',
    priority: 'medium',
    type: 'visit',
    dueDateDays: 1,
    assignedTo: 'Ani Wijaya',
    createdBy: 'Ani Wijaya',
    category: 'Site Visit',
    relatedTo: 'Toko Material Sumber Rejeki',
    tags: ['Rutin', 'Toko'],
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
  contracts: number;
  opportunities: number;
  discountApprovals: number;
  tasks: number;
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
    contracts: 0,
    opportunities: 0,
    discountApprovals: 0,
    tasks: 0,
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

  // 8. Contract (Bab 49) -- lihat catatan di SEED_CONTRACTS di atas
  // soal kenapa contractNumber di-hardcode & product bebas teks.
  for (const seed of SEED_CONTRACTS) {
    const res = await contractsRepository.create({
      contractNumber: seed.contractNumber,
      clientName: seed.clientName,
      company: seed.company,
      product: seed.product,
      value: seed.value,
      startDate: daysFromNow(seed.startDateDays),
      endDate: daysFromNow(seed.endDateDays),
      status: seed.status,
      signedBy: seed.signedBy,
      salesPerson: seed.salesPerson,
    });
    if (res.success) result.contracts += 1;
    else result.errors.push(`Contract "${seed.company}": ${res.error}`);
  }

  // 9. Opportunity (Bab 50) -- lihat catatan di SEED_OPPORTUNITIES soal
  // efeknya ke KPI dashboard Home.tsx (dikonfirmasi dengan user).
  for (const seed of SEED_OPPORTUNITIES) {
    const client = clientByCompany.get(seed.company);
    const res = await opportunitiesRepository.create({
      name: seed.name,
      clientId: client?.id ?? undefined,
      clientName: seed.company,
      contactPerson: seed.contactPerson,
      totalValue: seed.totalValue,
      currency: 'IDR',
      probability: seed.probability,
      closeDate: daysFromNow(seed.closeDateDays),
      stage: seed.stage,
      status: seed.status,
      source: seed.source,
      description: seed.description,
      closeReason: seed.closeReason,
      ownerName: seed.ownerName,
    } as any);
    if (res.success) result.opportunities += 1;
    else result.errors.push(`Opportunity "${seed.name}": ${res.error}`);
  }

  // 10. Discount Approval (Bab 50) -- lihat catatan di SEED_DISCOUNT_REQUESTS
  // soal discountPercent yang otomatis menentukan level & status server-side.
  for (const seed of SEED_DISCOUNT_REQUESTS) {
    const res = await discountApprovalsRepository.create({
      clientName: seed.clientName,
      productName: seed.productName,
      originalPrice: seed.originalPrice,
      discountPercent: seed.discountPercent,
      reason: seed.reason,
      region: seed.region,
      originalMargin: seed.originalMargin,
      proposedMargin: seed.proposedMargin,
    });
    if (res.success && res.data) {
      result.discountApprovals += 1;
      if (seed.decision && res.data.status === 'pending') {
        // Best-effort: butuh role approver level yang sesuai (lihat
        // discountApproverRolesForLevel di api/handler.ts). Kalau user
        // yang menekan tombol tidak punya role itu, request tetap ada
        // sebagai 'pending' -- bukan dianggap gagal.
        await discountApprovalsRepository.decide(res.data.id, {
          action: seed.decision,
          comment: seed.decisionComment,
        });
      }
    } else {
      result.errors.push(`Discount request "${seed.clientName}": ${res.error}`);
    }
  }

  // 11. Task (Bab 50) -- lihat catatan di SEED_TASKS soal migrasi dari
  // auto-seed TaskManagement.tsx ke tombol gabungan ini.
  for (const seed of SEED_TASKS) {
    const { dueDateDays, ...rest } = seed;
    const res = await tasksRepository.create({
      ...rest,
      dueDate: daysFromNow(dueDateDays),
    });
    if (res.success) result.tasks += 1;
    else result.errors.push(`Task "${seed.title}": ${res.error}`);
  }

  return result;
}
