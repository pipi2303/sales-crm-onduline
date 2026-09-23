// Bab 16: "Katalog Lengkap Lini Atap (Roofing)" ditranskripsi dari tabel
// dokumen (5 Product Family, kategori "Atap") — sumbernya adalah plan
// doc yang sudah disetujui.
//
// 4 kategori lain (Waterproofing, Photovoltaic, Green Roof, Aksesoris)
// TIDAK ada di plan doc sama sekali (Bab 8 sendiri bilang "4 kategori
// lain masih belum"). Baris-barisnya di bawah ini diambil dari riset
// langsung ke situs konsumen resmi Onduline Indonesia (id.onduline.com)
// atas permintaan user untuk keperluan DEMO ke calon user — bukan data
// SKU/harga resmi yang sudah divalidasi tim produk Onduline/Intramedika,
// sama seperti Family Atap di atas juga bukan SKU resmi. Kalau nanti
// dipakai di luar konteks demo, tolong konfirmasi ulang ke tim produk
// sebelum dipercaya sebagai master data bisnis.
//
// Catatan struktur per kategori (kenapa levelnya tidak seragam seperti
// Atap — lihat insight yang sudah dibahas):
// - Waterproofing & Aksesoris: tidak ada level "Family" yang nyata di
//   situs resminya (cuma daftar produk flat) — tiap produk dimodelkan
//   langsung sebagai satu Family, bukan dipaksa jadi Family+Product.
// - Photovoltaic (Ondusolar): hanya modul fisik (Classic, PRO HC, Tile)
//   dan dua "system" (On-Grid, Off-Grid) yang dimasukkan sebagai Family
//   demi variasi demo; "Residential Package" dan "Hybrid System" sengaja
//   DILEWATI karena sifatnya paket/bundle (gabungan beberapa produk),
//   bukan satu produk — memodelkannya sebagai Family sejajar modul
//   tunggal akan salah secara konsep sampai ada struktur bundle yang
//   benar.
// - Green Roof (Ondugreen): bukan beberapa produk, tapi SATU sistem
//   dengan banyak komponen BOM (membran, geotextile, drainer, dst) — jadi
//   cuma satu Family "ONDUGREEN", komponennya disebut di `type` saja,
//   tidak dibuat tabel BOM terpisah (sama seperti keputusan skip
//   sku_packaging dkk di Atap: belum ada kebutuhan konkret untuk itu).

export interface ProductCategorySeed {
  code: string;
  name: string;
}

export const productCategorySeeds: ProductCategorySeed[] = [
  { code: 'ATAP', name: 'Atap' },
  { code: 'WATERPROOFING', name: 'Waterproofing' },
  { code: 'PHOTOVOLTAIC', name: 'Photovoltaic' },
  { code: 'GREEN_ROOF', name: 'Green Roof' },
  { code: 'ACCESSORIES', name: 'Aksesoris' },
];

export interface ProductFamilySeed {
  code: string;
  name: string;
  type: string;
  categoryCode: string;
}

export const productFamilySeeds: ProductFamilySeed[] = [
  // Atap (Bab 16 — dari plan doc)
  { code: 'ONDV', name: 'ONDUVILLA', type: 'Genteng Bitumen', categoryCode: 'ATAP' },
  { code: 'ONDC', name: 'ONDULINE CLASSIC', type: 'Atap Bitumen Bergelombang', categoryCode: 'ATAP' },
  { code: 'ONDT', name: 'ONDULINE TILE', type: 'Atap Bitumen Tile', categoryCode: 'ATAP' },
  { code: 'ONDUC', name: 'ONDUCASA', type: 'Genteng Bitumen', categoryCode: 'ATAP' },
  { code: 'BARD', name: 'BARDOLINE', type: 'Asphalt Shingles / Sirap Aspal', categoryCode: 'ATAP' },

  // Waterproofing (riset situs resmi, belum divalidasi tim produk)
  { code: 'BITL', name: 'BITULINE', type: 'Bitumen Membran untuk Solusi Dak Bocor', categoryCode: 'WATERPROOFING' },
  { code: 'BITLP', name: 'BITULINE PRIMER', type: 'Emulsi Bitumen Primer', categoryCode: 'WATERPROOFING' },
  { code: 'EVLV', name: 'EVALON V', type: 'Membran Waterproofing Sintetis', categoryCode: 'WATERPROOFING' },
  { code: 'ONDB', name: 'ONDUBAND', type: 'Solusi Bocor Atap & Dinding', categoryCode: 'WATERPROOFING' },
  { code: 'FLSB', name: 'FLASHING BAND', type: 'Self Adhesive Flashing Band', categoryCode: 'WATERPROOFING' },
  { code: 'ONDCT', name: 'ONDUCOAT 739', type: 'Pelapis Anti Bocor Elastis Berbahan PU', categoryCode: 'WATERPROOFING' },

  // Photovoltaic (Ondusolar) — lihat catatan scoping di atas soal
  // package/bundle yang sengaja dilewati.
  { code: 'OSCL', name: 'ONDUSOLAR CLASSIC', type: 'Modul PV Standar', categoryCode: 'PHOTOVOLTAIC' },
  { code: 'OSPH', name: 'ONDUSOLAR PRO HC', type: 'Modul PV Premium High-Capacity', categoryCode: 'PHOTOVOLTAIC' },
  { code: 'OSTL', name: 'ONDUSOLAR TILE', type: 'PV Terintegrasi Genteng', categoryCode: 'PHOTOVOLTAIC' },
  { code: 'OSOG', name: 'ONDUSOLAR ON-GRID SYSTEM', type: 'Sistem PV Tersambung Jaringan Listrik', categoryCode: 'PHOTOVOLTAIC' },
  { code: 'OSFG', name: 'ONDUSOLAR OFF-GRID SYSTEM', type: 'Sistem PV Mandiri (Tanpa Jaringan Listrik)', categoryCode: 'PHOTOVOLTAIC' },

  // Green Roof (Ondugreen) — satu Family, bukan beberapa (lihat catatan
  // scoping di atas).
  {
    code: 'ONDG',
    name: 'ONDUGREEN',
    type: 'Sistem Atap Hijau (membran akar, geotextile, drainer, filter, substrate — Extensive/Semi-intensive)',
    categoryCode: 'GREEN_ROOF',
  },

  // Aksesoris — daftar flat dari situs resmi, tiap item langsung jadi
  // satu Family (lihat catatan scoping di atas).
  { code: 'NOKS', name: 'NOK STANDAR', type: 'Penutup Puncak Atap', categoryCode: 'ACCESSORIES' },
  { code: 'OVCT', name: 'ONDUVILLA CLEAR TILE', type: 'Genteng Transparan Anti-UV', categoryCode: 'ACCESSORIES' },
  { code: 'OTST', name: 'ONDUTISS STRONG', type: 'Underlayment untuk Sirkulasi Udara', categoryCode: 'ACCESSORIES' },
  { code: 'SKYL', name: 'SKYLIGHT', type: 'Pencahayaan Alami & Akses Atap', categoryCode: 'ACCESSORIES' },
  { code: 'CVFL', name: 'CORRUGATED VENTILATED FILLER', type: 'Penghalang Masuk Hewan Pengerat/Burung', categoryCode: 'ACCESSORIES' },
  { code: 'VSTD', name: 'VERGE STANDARD ONDULINE', type: 'Trim Tepi Atap', categoryCode: 'ACCESSORIES' },
  { code: 'CCOV', name: 'CLOSURE CAP ONDUVILLA', type: 'Penutup Ujung Bubungan/Hip', categoryCode: 'ACCESSORIES' },
  { code: 'VPOV', name: 'VERGE PIECE ONDUVILLA', type: 'Trim Tepi untuk Sistem Onduvilla', categoryCode: 'ACCESSORIES' },
  { code: 'SCOV', name: 'SLIM CAP ONDUVILLA', type: 'Penutup Bubungan/Hip (kemiringan hingga 60%)', categoryCode: 'ACCESSORIES' },
  { code: 'APOV', name: 'APRON PIECE ONDUVILLA', type: 'Waterproofing & Ventilasi Sambungan Bubungan/Dinding', categoryCode: 'ACCESSORIES' },
  { code: 'ADPT', name: 'ADAPTER', type: 'Konektor Skylight ke Sistem Onduvilla', categoryCode: 'ACCESSORIES' },
  { code: 'OSCR', name: 'ONDULINE SCREW', type: 'Baut Pemasangan Atap', categoryCode: 'ACCESSORIES' },
];

// Satu contoh Product (SKU) per Family di atas, supaya kategori-kategori
// ini benar-benar KELIHATAN di modul Products (bukan cuma ada di tabel
// ProductCategory/ProductFamily yang belum ada UI-nya sendiri) — sesuai
// permintaan user: aplikasi ini untuk demo ke calon user, jadi produk
// Onduline-nya harus terlihat langsung di halaman Products.
//
// `category` di sini adalah string bebas (field lama, dipakai UI cuma
// untuk filter dropdown — lihat ProductCatalog.tsx), BUKAN relasi ke
// ProductCategory table. Harga/berat/satuan adalah perkiraan wajar untuk
// tampilan demo, bukan price list resmi.
export interface ProductInstanceSeed {
  familyCode: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  unitOfMeasure: string;
  weightKg?: number;
  description: string;
  features: string[];
  variantLabel?: string;
  // Fase A follow-up (23 Sep 2026): stock/sold realistis per SKU -- lihat
  // MEMORY.md. Sebelumnya seed.ts hardcode stock:200/sold:5 SERAGAM untuk
  // semua 29 produk, dilaporkan user sebagai temuan gap dummy data yang
  // tidak realistis.
  stock: number;
  sold: number;
}

export const productInstanceSeeds: ProductInstanceSeed[] = [
  // Atap
  { familyCode: 'ONDV', sku: 'ONDV-SR', name: 'ONDUVILLA Shaded Red', category: 'Atap', price: 89000, unitOfMeasure: 'm2', weightKg: 3.2, description: 'Genteng bitumen ONDUVILLA warna Shaded Red, tahan cuaca tropis.', features: ['Tahan Cuaca Tropis', 'Anti Karat', 'Pemasangan Cepat'], variantLabel: 'Shaded Red', stock: 620, sold: 245 },
  { familyCode: 'ONDC', sku: 'ONDC-BRN', name: 'ONDULINE CLASSIC Brown', category: 'Atap', price: 45000, unitOfMeasure: 'm2', weightKg: 2.8, description: 'Atap bitumen bergelombang ONDULINE CLASSIC warna Brown.', features: ['Ringan', 'Ekonomis', 'Anti Bocor'], variantLabel: 'Brown', stock: 800, sold: 310 },
  { familyCode: 'ONDT', sku: 'ONDT-TRC', name: 'ONDULINE TILE Terracotta', category: 'Atap', price: 65000, unitOfMeasure: 'm2', weightKg: 3.0, description: 'Atap bitumen bentuk tile ONDULINE TILE warna Terracotta.', features: ['Tampilan Genteng Keramik', 'Ringan', 'Tahan Lama'], variantLabel: 'Terracotta', stock: 540, sold: 190 },
  { familyCode: 'ONDUC', sku: 'ONDUC-BLK', name: 'ONDUCASA Black', category: 'Atap', price: 78000, unitOfMeasure: 'm2', weightKg: 3.1, description: 'Genteng bitumen ONDUCASA warna Black.', features: ['Estetika Premium', 'Tahan UV'], variantLabel: 'Black', stock: 410, sold: 140 },
  { familyCode: 'BARD', sku: 'BARD-GRY', name: 'BARDOLINE Grey', category: 'Atap', price: 95000, unitOfMeasure: 'm2', weightKg: 3.5, description: 'Asphalt shingle BARDOLINE warna Grey untuk tampilan sirap aspal.', features: ['Gaya Sirap Aspal', 'Tahan Cuaca Ekstrem'], variantLabel: 'Grey', stock: 320, sold: 95 },

  // Waterproofing
  { familyCode: 'BITL', sku: 'BITL-3MM', name: 'BITULINE 3mm', category: 'Waterproofing', price: 55000, unitOfMeasure: 'roll', weightKg: 18, description: 'Membran bitumen BITULINE tebal 3mm untuk dak beton bocor.', features: ['Anti Bocor', 'Tahan Air'], stock: 260, sold: 85 },
  { familyCode: 'BITLP', sku: 'BITLP-20L', name: 'BITULINE PRIMER 20L', category: 'Waterproofing', price: 850000, unitOfMeasure: 'pail', weightKg: 20, description: 'Primer emulsi bitumen BITULINE, kemasan pail 20 liter.', features: ['Daya Rekat Tinggi', 'TS113'], stock: 90, sold: 22 },
  { familyCode: 'EVLV', sku: 'EVLV-15', name: 'EVALON V 1.5mm', category: 'Waterproofing', price: 120000, unitOfMeasure: 'roll', weightKg: 12, description: 'Membran waterproofing sintetis EVALON V tebal 1.5mm.', features: ['Sintetis', 'Elastis'], stock: 180, sold: 48 },
  { familyCode: 'ONDB', sku: 'ONDB-STD', name: 'ONDUBAND Standard', category: 'Waterproofing', price: 35000, unitOfMeasure: 'roll', weightKg: 8, description: 'Solusi bocor atap & dinding ONDUBAND.', features: ['Multi Permukaan'], stock: 300, sold: 110 },
  { familyCode: 'FLSB', sku: 'FLSB-STD', name: 'FLASHING BAND Self Adhesive', category: 'Waterproofing', price: 28000, unitOfMeasure: 'roll', weightKg: 5, description: 'Flashing band self-adhesive untuk sambungan & talang.', features: ['Self Adhesive', 'Mudah Dipasang'], stock: 350, sold: 130 },
  { familyCode: 'ONDCT', sku: 'ONDCT-739', name: 'ONDUCOAT 739', category: 'Waterproofing', price: 950000, unitOfMeasure: 'pail', weightKg: 20, description: 'Pelapis anti bocor elastis berbahan PU modifikasi, kemasan pail 20kg.', features: ['Berbahan PU', 'Elastis', 'Untuk Area Ekspos'], stock: 60, sold: 14 },

  // Photovoltaic
  { familyCode: 'OSCL', sku: 'OSCL-450', name: 'ONDUSOLAR CLASSIC 450Wp', category: 'Photovoltaic', price: 2500000, unitOfMeasure: 'unit', weightKg: 22, description: 'Modul PV standar ONDUSOLAR CLASSIC 450Wp.', features: ['450Wp', 'Garansi Panel'], stock: 25, sold: 6 },
  { familyCode: 'OSPH', sku: 'OSPH-550', name: 'ONDUSOLAR PRO HC 550Wp', category: 'Photovoltaic', price: 3800000, unitOfMeasure: 'unit', weightKg: 25, description: 'Modul PV premium high-capacity ONDUSOLAR PRO HC 550Wp.', features: ['550Wp', 'High Capacity'], stock: 18, sold: 4 },
  { familyCode: 'OSTL', sku: 'OSTL-STD', name: 'ONDUSOLAR TILE Integrated', category: 'Photovoltaic', price: 4200000, unitOfMeasure: 'unit', weightKg: 20, description: 'PV terintegrasi genteng ONDUSOLAR TILE.', features: ['Terintegrasi Genteng', 'Estetika Atap'], stock: 12, sold: 2 },
  { familyCode: 'OSOG', sku: 'OSOG-5KWP', name: 'ONDUSOLAR ON-GRID SYSTEM 5kWp', category: 'Photovoltaic', price: 45000000, unitOfMeasure: 'unit', description: 'Sistem PV tersambung jaringan listrik (on-grid), kapasitas 5kWp.', features: ['5kWp', 'Tersambung PLN'], stock: 6, sold: 1 },
  { familyCode: 'OSFG', sku: 'OSFG-5KWP', name: 'ONDUSOLAR OFF-GRID SYSTEM 5kWp', category: 'Photovoltaic', price: 68000000, unitOfMeasure: 'unit', description: 'Sistem PV mandiri (off-grid) dengan battery storage, kapasitas 5kWp.', features: ['5kWp', 'Battery Storage', 'Mandiri Tanpa PLN'], stock: 4, sold: 0 },

  // Green Roof
  { familyCode: 'ONDG', sku: 'ONDG-EXT', name: 'ONDUGREEN Extensive System', category: 'Green Roof', price: 350000, unitOfMeasure: 'm2', description: 'Sistem atap hijau ONDUGREEN tipe Extensive (beban vegetasi 48-122 kg/m2).', features: ['Extensive System', 'Root Barrier', 'Drainage Layer'], stock: 35, sold: 5 },

  // Aksesoris
  { familyCode: 'NOKS', sku: 'NOKS-STD', name: 'NOK STANDAR', category: 'Aksesoris', price: 25000, unitOfMeasure: 'pcs', description: 'Penutup puncak atap dan pelindung dari kebocoran.', features: ['Penutup Puncak'], stock: 600, sold: 220 },
  { familyCode: 'OVCT', sku: 'OVCT-STD', name: 'ONDUVILLA CLEAR TILE', category: 'Aksesoris', price: 45000, unitOfMeasure: 'pcs', description: 'Genteng transparan anti-UV untuk sistem Onduvilla.', features: ['Transparan', 'Anti UV'], stock: 280, sold: 75 },
  { familyCode: 'OTST', sku: 'OTST-STD', name: 'ONDUTISS STRONG', category: 'Aksesoris', price: 32000, unitOfMeasure: 'm2', description: 'Underlayment fabric untuk sirkulasi udara di bawah atap.', features: ['Sirkulasi Udara', 'Underlayment'], stock: 450, sold: 160 },
  { familyCode: 'SKYL', sku: 'SKYL-STD', name: 'SKYLIGHT', category: 'Aksesoris', price: 380000, unitOfMeasure: 'pcs', description: 'Pencahayaan alami atap dan akses ke atap.', features: ['Pencahayaan Alami', 'Akses Atap'], stock: 120, sold: 28 },
  { familyCode: 'CVFL', sku: 'CVFL-STD', name: 'CORRUGATED VENTILATED FILLER', category: 'Aksesoris', price: 15000, unitOfMeasure: 'pcs', description: 'Penghalang celah atap dari hewan pengerat dan burung.', features: ['Anti Hewan Pengerat'], stock: 700, sold: 240 },
  { familyCode: 'VSTD', sku: 'VSTD-STD', name: 'VERGE STANDARD ONDULINE', category: 'Aksesoris', price: 22000, unitOfMeasure: 'pcs', description: 'Trim tepi atap Onduline untuk sisi yang aman & estetis.', features: ['Trim Tepi Atap'], stock: 650, sold: 280 },
  { familyCode: 'CCOV', sku: 'CCOV-STD', name: 'CLOSURE CAP ONDUVILLA', category: 'Aksesoris', price: 18000, unitOfMeasure: 'pcs', description: 'Penutup ujung bubungan/hip untuk sistem Onduvilla.', features: ['Penutup Bubungan/Hip'], stock: 720, sold: 260 },
  { familyCode: 'VPOV', sku: 'VPOV-STD', name: 'VERGE PIECE ONDUVILLA', category: 'Aksesoris', price: 24000, unitOfMeasure: 'pcs', description: 'Trim tepi khusus untuk sistem atap Onduvilla.', features: ['Trim Tepi Onduvilla'], stock: 610, sold: 230 },
  { familyCode: 'SCOV', sku: 'SCOV-STD', name: 'SLIM CAP ONDUVILLA', category: 'Aksesoris', price: 26000, unitOfMeasure: 'pcs', description: 'Penutup bubungan/hip untuk kemiringan atap hingga 60% (31 derajat).', features: ['Untuk Kemiringan hingga 60%'], stock: 480, sold: 175 },
  { familyCode: 'APOV', sku: 'APOV-STD', name: 'APRON PIECE ONDUVILLA', category: 'Aksesoris', price: 20000, unitOfMeasure: 'pcs', description: 'Komponen waterproofing & ventilasi sambungan bubungan/dinding.', features: ['Waterproofing Sambungan'], stock: 550, sold: 195 },
  { familyCode: 'ADPT', sku: 'ADPT-STD', name: 'ADAPTER', category: 'Aksesoris', price: 35000, unitOfMeasure: 'pcs', description: 'Konektor yang menjembatani instalasi Skylight dengan atap Onduvilla.', features: ['Konektor Skylight'], stock: 340, sold: 110 },
  { familyCode: 'OSCR', sku: 'OSCR-100', name: 'ONDULINE SCREW (isi 100)', category: 'Aksesoris', price: 45000, unitOfMeasure: 'box', description: 'Baut pemasangan atap Onduline, kemasan box isi 100 pcs.', features: ['Kemasan Box 100pcs'], stock: 900, sold: 340 },
];
