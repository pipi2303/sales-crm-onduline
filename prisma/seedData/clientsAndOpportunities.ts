// Fase A (Bab 13/14 follow-up, 23 Sep 2026): data Client + Opportunity
// realistis, sengaja hand-authored (bukan random generator) supaya tetap
// deterministic, reviewable, dan konsisten kalau di-reseed berkali-kali --
// mengikuti pola yang sama dengan distributorsAndStores.ts/productCatalog.ts.
//
// KENAPA INI DIBUTUHKAN (temuan sesi ini, lihat MEMORY.md): sebelum
// perubahan ini, produksi punya 0 Client dan 0 Opportunity sama sekali --
// artinya dashboard Bab 13 (Revenue MTD/YTD, Win Rate, kepatuhan visit)
// dan fitur "AI" Bab 14 (yang semuanya rule-based, bukan LLM sungguhan)
// tidak akan punya apa pun untuk ditampilkan walau kodenya sempurna. Data
// di sini adalah fondasi supaya kedua bab itu punya sesuatu yang nyata
// untuk dihitung.
//
// Desain data:
// - 12 Client, masing-masing 3 terhubung ke tiap "anchor" Distributor/Toko
//   yang beririsan dengan salah satu dari 4 Territory yang SUDAH ada di
//   produksi (dibuat manual oleh user lewat UI, BUKAN di-seed di sini --
//   lihat seed.ts) -- supaya join Client -> Distributor/Store -> Territory
//   konsisten, bukan Client yang "mengambang" tanpa wilayah penjualan
//   nyata: DIST-JKT01 (Jakarta Selatan/Jakarta Pusat), DIST-JBR01
//   (Bandung), DIST-JTM01 (Surabaya), TOKO-JBR02 (Bogor, masuk wilayah
//   Territory Bandung/Jawa Barat).
// - kategoriClient memakai persis 6 opsi yang ada di dropdown ClientForm.tsx
//   (Toko Bangunan/Distributor/Kontraktor/Developer/Instansi Pemerintah/
//   End User) -- sengaja TIDAK ada yang berkategori "Distributor" di sini
//   karena itu akan tumpang tindih dengan distributorId/storeId yang sudah
//   menghubungkan Client ke jaringan distribusi.
// - 24 Opportunity (2 per Client), sengaja divariasikan stage/status/
//   tanggal supaya win rate & tren bulanan (MTD/YTD) tidak flat: 11 WON,
//   5 LOST (win rate ~69% -- realistis untuk distributor B2B/B2B2C yang
//   sudah mapan, tidak dibuat 100% biar tidak terlihat palsu), 8 masih
//   OPEN (mayoritas dibuat Agu-Sep 2026, closeDate di masa depan --
//   mencerminkan pipeline yang sedang berjalan per tanggal seed ini
//   ditulis, 23 Sep 2026). Tanggal WON/LOST disebar Jan-Sep 2026 supaya
//   tren bulanan (revenue per bulan) tidak kosong di bulan-bulan awal.
// - Kategori produk per Opportunity disesuaikan konteks Client: proyek
//   kontraktor/developer/instansi (salesFlow PROJECT) memakai kombinasi
//   Atap + Waterproofing + sesekali Photovoltaic (proyek besar/premium);
//   toko/end user (salesFlow RETAIL) memakai Atap + Aksesoris dalam
//   kuantitas lebih kecil -- supaya insight #6 (penetrasi kategori produk)
//   punya sebaran yang masuk akal, bukan seragam.
//
// Yang SENGAJA TIDAK di-seed di sini (lihat MEMORY.md Fase A):
// PerformanceTarget.actual adalah angka yang di-input manual oleh Sales
// Manager lewat TerritoryManagement.tsx (bukan dihitung otomatis dari
// Opportunity di mana pun di aplikasi ini saat ini) -- membuat angka
// target/actual palsu di sini berisiko bertentangan dengan angka yang
// nanti benar-benar dimasukkan tim. Dashboard Bab 13 (Fase B) akan
// menghitung Revenue MTD/YTD & Win Rate langsung dari Opportunity di
// bawah ini, bukan dari PerformanceTarget.

export interface ClientSeed {
  idCustomer: string;
  namaEntitas: string;
  kategoriClient: 'Toko Bangunan' | 'Kontraktor' | 'Developer' | 'Instansi Pemerintah' | 'End User';
  salesFlow: 'PROJECT' | 'RETAIL';
  owner: string;
  alamatLengkap: string;
  namaPic: string;
  jabatanPic: string;
  whatsappPic: string;
  emailResmi: string;
  distributorCode?: string; // cocok dengan distributorSeeds' `code` (distributorsAndStores.ts)
  storeCode?: string; // cocok dengan storeSeeds' `code`
  submittedByEmail: string; // user (demoUsers/production) yang "mengajukan" client ini
}

export const clientSeeds: ClientSeed[] = [
  // Anchor: DIST-JKT01 (Distributor DKI Jakarta) -- Territory Jakarta Selatan / Jakarta Pusat
  {
    idCustomer: 'CUST-0001',
    namaEntitas: 'PT Kontraktor Nusantara Jaya',
    kategoriClient: 'Kontraktor',
    salesFlow: 'PROJECT',
    owner: 'Bambang Wijaya',
    alamatLengkap: 'Jl. Fatmawati Raya No. 45, Jakarta Selatan, DKI Jakarta',
    namaPic: 'Bambang Wijaya',
    jabatanPic: 'Direktur',
    whatsappPic: '081234560001',
    emailResmi: 'bambang@kontraktornusantara.co.id',
    distributorCode: 'DIST-JKT01',
    submittedByEmail: 'manager@salesmonitor.com',
  },
  {
    idCustomer: 'CUST-0002',
    namaEntitas: 'CV Bangun Sejahtera',
    kategoriClient: 'Toko Bangunan',
    salesFlow: 'RETAIL',
    owner: 'Dewi Kartika',
    alamatLengkap: 'Jl. Kramat Raya No. 88, Jakarta Pusat, DKI Jakarta',
    namaPic: 'Dewi Kartika',
    jabatanPic: 'Pemilik',
    whatsappPic: '081234560002',
    emailResmi: 'dewi@bangunsejahtera.co.id',
    distributorCode: 'DIST-JKT01',
    submittedByEmail: 'manager@salesmonitor.com',
  },
  {
    idCustomer: 'CUST-0003',
    namaEntitas: 'Perumahan Griya Asri',
    kategoriClient: 'Developer',
    salesFlow: 'PROJECT',
    owner: 'Agus Setiawan',
    alamatLengkap: 'Jl. TB Simatupang Kav. 12, Jakarta Selatan, DKI Jakarta',
    namaPic: 'Agus Setiawan',
    jabatanPic: 'Manajer Proyek',
    whatsappPic: '081234560003',
    emailResmi: 'agus@griyaasri.co.id',
    distributorCode: 'DIST-JKT01',
    submittedByEmail: 'rivelino.hasugian@gmail.com',
  },

  // Anchor: DIST-JBR01 (Distributor Jawa Barat, Bandung) -- Territory Bandung
  {
    idCustomer: 'CUST-0004',
    namaEntitas: 'PT Cipta Beton Bandung',
    kategoriClient: 'Kontraktor',
    salesFlow: 'PROJECT',
    owner: 'Hendra Gunawan',
    alamatLengkap: 'Jl. Soekarno-Hatta No. 210, Bandung, Jawa Barat',
    namaPic: 'Hendra Gunawan',
    jabatanPic: 'Site Manager',
    whatsappPic: '081334560004',
    emailResmi: 'hendra@ciptabetonbdg.co.id',
    distributorCode: 'DIST-JBR01',
    submittedByEmail: 'rivelino.hasugian@gmail.com',
  },
  {
    idCustomer: 'CUST-0005',
    namaEntitas: 'Toko Material Jaya Bandung',
    kategoriClient: 'Toko Bangunan',
    salesFlow: 'RETAIL',
    owner: 'Rina Puspita',
    alamatLengkap: 'Jl. Ahmad Yani No. 55, Bandung, Jawa Barat',
    namaPic: 'Rina Puspita',
    jabatanPic: 'Pemilik',
    whatsappPic: '081334560005',
    emailResmi: 'rina@materialjayabdg.co.id',
    distributorCode: 'DIST-JBR01',
    submittedByEmail: 'rivelino.hasugian@gmail.com',
  },
  {
    idCustomer: 'CUST-0006',
    namaEntitas: 'Perum Bukit Indah Residence',
    kategoriClient: 'Developer',
    salesFlow: 'PROJECT',
    owner: 'Yuli Astuti',
    alamatLengkap: 'Jl. Dago Atas No. 30, Bandung, Jawa Barat',
    namaPic: 'Yuli Astuti',
    jabatanPic: 'Kepala Bagian Pengadaan',
    whatsappPic: '081334560006',
    emailResmi: 'yuli@bukitindahresidence.co.id',
    distributorCode: 'DIST-JBR01',
    submittedByEmail: 'manager@salesmonitor.com',
  },

  // Anchor: DIST-JTM01 (Distributor Jawa Timur, Surabaya) -- Territory Surabaya
  {
    idCustomer: 'CUST-0007',
    namaEntitas: 'PT Surya Konstruksi Surabaya',
    kategoriClient: 'Kontraktor',
    salesFlow: 'PROJECT',
    owner: 'Fajar Nugroho',
    alamatLengkap: 'Jl. Rungkut Industri No. 17, Surabaya, Jawa Timur',
    namaPic: 'Fajar Nugroho',
    jabatanPic: 'Direktur Operasional',
    whatsappPic: '081534560007',
    emailResmi: 'fajar@suryakonstruksisby.co.id',
    distributorCode: 'DIST-JTM01',
    submittedByEmail: 'manager@salesmonitor.com',
  },
  {
    idCustomer: 'CUST-0008',
    namaEntitas: 'UD Sumber Bangunan',
    kategoriClient: 'Toko Bangunan',
    salesFlow: 'RETAIL',
    owner: 'Maya Sari',
    alamatLengkap: 'Jl. Kertajaya No. 102, Surabaya, Jawa Timur',
    namaPic: 'Maya Sari',
    jabatanPic: 'Pemilik',
    whatsappPic: '081534560008',
    emailResmi: 'maya@sumberbangunan.co.id',
    distributorCode: 'DIST-JTM01',
    submittedByEmail: 'manager@salesmonitor.com',
  },
  {
    idCustomer: 'CUST-0009',
    namaEntitas: 'Kantor Kelurahan Rungkut Surabaya',
    kategoriClient: 'Instansi Pemerintah',
    salesFlow: 'PROJECT',
    owner: 'Kartono',
    alamatLengkap: 'Jl. Kali Rungkut No. 5, Surabaya, Jawa Timur',
    namaPic: 'Kartono',
    jabatanPic: 'Kepala Bagian Umum',
    whatsappPic: '081534560009',
    emailResmi: 'kartono@kelurahanrungkut.go.id',
    distributorCode: 'DIST-JTM01',
    submittedByEmail: 'admin@salesmonitor.com',
  },

  // Anchor: TOKO-JBR02 (Toko Bangunan Bogor Sejahtera) -- Territory Bandung/Jawa Barat (Bogor)
  {
    idCustomer: 'CUST-0010',
    namaEntitas: 'Villa Puncak Bogor',
    kategoriClient: 'End User',
    salesFlow: 'RETAIL',
    owner: 'Sri Wahyuni',
    alamatLengkap: 'Jl. Raya Puncak KM 8, Bogor, Jawa Barat',
    namaPic: 'Sri Wahyuni',
    jabatanPic: 'Pemilik',
    whatsappPic: '081234560010',
    emailResmi: 'sri.wahyuni@gmail.com',
    storeCode: 'TOKO-JBR02',
    submittedByEmail: 'nikky@gmail.com',
  },
  {
    idCustomer: 'CUST-0011',
    namaEntitas: 'CV Karya Atap Bogor',
    kategoriClient: 'Kontraktor',
    salesFlow: 'PROJECT',
    owner: 'Doni Pratama',
    alamatLengkap: 'Jl. Pajajaran No. 60, Bogor, Jawa Barat',
    namaPic: 'Doni Pratama',
    jabatanPic: 'Pemilik',
    whatsappPic: '081234560011',
    emailResmi: 'doni@karyaatapbogor.co.id',
    storeCode: 'TOKO-JBR02',
    submittedByEmail: 'nikky@gmail.com',
  },
  {
    idCustomer: 'CUST-0012',
    namaEntitas: 'Toko Bangunan Makmur Cibinong',
    kategoriClient: 'Toko Bangunan',
    salesFlow: 'RETAIL',
    owner: 'Ani Suryani',
    alamatLengkap: 'Jl. Raya Cibinong No. 22, Bogor, Jawa Barat',
    namaPic: 'Ani Suryani',
    jabatanPic: 'Pemilik',
    whatsappPic: '081234560012',
    emailResmi: 'ani@makmurcibinong.co.id',
    storeCode: 'TOKO-JBR02',
    submittedByEmail: 'nikky@gmail.com',
  },
];

export interface OpportunityProductSeed {
  sku: string; // cocok dengan productInstanceSeeds' `sku` (productCatalog.ts)
  quantity: number;
}

export interface OpportunitySeed {
  clientIdCustomer: string; // cocok dengan ClientSeed.idCustomer di atas
  name: string;
  ownerEmail: string; // sales rep -- cocok dengan demoUsers/production user
  territoryName: string; // cocok dengan nama Territory yang sudah ada (dibuat manual, bukan di-seed)
  stage: 'prospecting' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  status: 'open' | 'won' | 'lost';
  createdDate: string; // ISO date
  closeDate: string; // ISO date
  actualCloseDate?: string; // hanya diisi kalau sudah won/lost
  source: string;
  description: string;
  products: OpportunityProductSeed[];
}

export const opportunitySeeds: OpportunitySeed[] = [
  // CUST-0001 -- PT Kontraktor Nusantara Jaya
  {
    clientIdCustomer: 'CUST-0001', name: 'Renovasi Atap Gudang Kontraktor Nusantara',
    ownerEmail: 'pipi@gmail.com', territoryName: 'Jakarta Selatan',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-01-10', closeDate: '2026-02-15', actualCloseDate: '2026-02-15',
    source: 'Referral', description: 'Penggantian atap gudang logistik seluas 500m2.',
    products: [{ sku: 'BARD-GRY', quantity: 500 }, { sku: 'VSTD-STD', quantity: 50 }],
  },
  {
    clientIdCustomer: 'CUST-0001', name: 'Proyek Perumahan Tahap 2 - Atap',
    ownerEmail: 'pipi@gmail.com', territoryName: 'Jakarta Selatan',
    stage: 'negotiation', status: 'open',
    createdDate: '2026-08-01', closeDate: '2026-11-15',
    source: 'Existing Client', description: 'Lanjutan proyek perumahan tahap 2, kebutuhan atap 1000m2.',
    products: [{ sku: 'ONDC-BRN', quantity: 1000 }],
  },

  // CUST-0002 -- CV Bangun Sejahtera
  {
    clientIdCustomer: 'CUST-0002', name: 'Restock Genteng Bitumen Q1',
    ownerEmail: 'sales@salesmonitor.com', territoryName: 'Jakarta Pusat',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-02-05', closeDate: '2026-02-28', actualCloseDate: '2026-02-28',
    source: 'Existing Client', description: 'Restock rutin genteng untuk stok toko.',
    products: [{ sku: 'ONDT-TRC', quantity: 300 }, { sku: 'OSCR-100', quantity: 20 }],
  },
  {
    clientIdCustomer: 'CUST-0002', name: 'Order Aksesoris Rutin',
    ownerEmail: 'sales@salesmonitor.com', territoryName: 'Jakarta Pusat',
    stage: 'closed-lost', status: 'lost',
    createdDate: '2026-03-01', closeDate: '2026-03-20', actualCloseDate: '2026-03-20',
    source: 'Existing Client', description: 'Kalah harga dari kompetitor lokal.',
    products: [{ sku: 'ADPT-STD', quantity: 100 }, { sku: 'VPOV-STD', quantity: 50 }],
  },

  // CUST-0003 -- Perumahan Griya Asri
  {
    clientIdCustomer: 'CUST-0003', name: 'Atap Cluster Rumah Tipe 36 (80 unit)',
    ownerEmail: 'pipi@gmail.com', territoryName: 'Jakarta Selatan',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-03-15', closeDate: '2026-04-30', actualCloseDate: '2026-04-30',
    source: 'Cold Call', description: 'Pengadaan atap untuk cluster 80 unit rumah tipe 36.',
    products: [{ sku: 'ONDV-SR', quantity: 4000 }, { sku: 'VSTD-STD', quantity: 400 }, { sku: 'SKYL-STD', quantity: 20 }],
  },
  {
    clientIdCustomer: 'CUST-0003', name: 'Waterproofing Basement Tahap 2',
    ownerEmail: 'pipi@gmail.com', territoryName: 'Jakarta Selatan',
    stage: 'proposal', status: 'open',
    createdDate: '2026-09-01', closeDate: '2026-10-31',
    source: 'Existing Client', description: 'Waterproofing area basement parkir cluster tahap 2.',
    products: [{ sku: 'BITLP-20L', quantity: 30 }, { sku: 'BITL-3MM', quantity: 200 }],
  },

  // CUST-0004 -- PT Cipta Beton Bandung
  {
    clientIdCustomer: 'CUST-0004', name: 'Proyek Ruko Komersial Bandung',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-01-20', closeDate: '2026-02-25', actualCloseDate: '2026-02-25',
    source: 'Referral', description: 'Atap untuk 6 unit ruko komersial.',
    products: [{ sku: 'BARD-GRY', quantity: 600 }],
  },
  {
    clientIdCustomer: 'CUST-0004', name: 'Renovasi Kantor Cabang',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-lost', status: 'lost',
    createdDate: '2026-04-10', closeDate: '2026-05-15', actualCloseDate: '2026-05-15',
    source: 'Cold Call', description: 'Anggaran proyek dipotong, ditunda tanpa batas waktu.',
    products: [{ sku: 'ONDC-BRN', quantity: 300 }],
  },

  // CUST-0005 -- Toko Material Jaya Bandung
  {
    clientIdCustomer: 'CUST-0005', name: 'Restock Bulanan Aksesoris',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-05-05', closeDate: '2026-06-10', actualCloseDate: '2026-06-10',
    source: 'Existing Client', description: 'Restock bulanan aksesoris atap.',
    products: [{ sku: 'NOKS-STD', quantity: 150 }, { sku: 'CCOV-STD', quantity: 100 }],
  },
  {
    clientIdCustomer: 'CUST-0005', name: 'Order Genteng Musim Kemarau',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'prospecting', status: 'open',
    createdDate: '2026-09-10', closeDate: '2026-12-01',
    source: 'Existing Client', description: 'Penjajakan order genteng untuk musim kemarau.',
    products: [{ sku: 'ONDT-TRC', quantity: 500 }],
  },

  // CUST-0006 -- Perum Bukit Indah Residence
  {
    clientIdCustomer: 'CUST-0006', name: 'Atap Perumahan Cluster Melati (60 unit)',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-06-01', closeDate: '2026-07-20', actualCloseDate: '2026-07-20',
    source: 'Referral', description: 'Pengadaan atap untuk cluster Melati, 60 unit rumah.',
    products: [{ sku: 'ONDV-SR', quantity: 3000 }, { sku: 'VSTD-STD', quantity: 300 }],
  },
  {
    clientIdCustomer: 'CUST-0006', name: 'Panel Surya Rooftop Cluster Premium',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Bandung',
    stage: 'negotiation', status: 'open',
    createdDate: '2026-08-15', closeDate: '2026-11-01',
    source: 'Existing Client', description: 'Rencana instalasi panel surya on-grid untuk cluster premium.',
    products: [{ sku: 'OSOG-5KWP', quantity: 15 }],
  },

  // CUST-0007 -- PT Surya Konstruksi Surabaya
  {
    clientIdCustomer: 'CUST-0007', name: 'Proyek Gudang Logistik Surabaya',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Surabaya',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-02-10', closeDate: '2026-03-20', actualCloseDate: '2026-03-20',
    source: 'Referral', description: 'Atap gudang logistik seluas 800m2.',
    products: [{ sku: 'BARD-GRY', quantity: 800 }],
  },
  {
    clientIdCustomer: 'CUST-0007', name: 'Renovasi Pabrik Tekstil',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Surabaya',
    stage: 'closed-lost', status: 'lost',
    createdDate: '2026-05-01', closeDate: '2026-06-15', actualCloseDate: '2026-06-15',
    source: 'Cold Call', description: 'Klien memilih vendor lain dengan lead time lebih cepat.',
    products: [{ sku: 'ONDC-BRN', quantity: 400 }],
  },

  // CUST-0008 -- UD Sumber Bangunan
  {
    clientIdCustomer: 'CUST-0008', name: 'Restock Aksesoris Rutin Q2',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Surabaya',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-04-05', closeDate: '2026-05-20', actualCloseDate: '2026-05-20',
    source: 'Existing Client', description: 'Restock rutin kuartal kedua.',
    products: [{ sku: 'OSCR-100', quantity: 30 }, { sku: 'ADPT-STD', quantity: 50 }],
  },
  {
    clientIdCustomer: 'CUST-0008', name: 'Order Waterproofing Musim Hujan',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Surabaya',
    stage: 'proposal', status: 'open',
    createdDate: '2026-09-05', closeDate: '2026-11-10',
    source: 'Existing Client', description: 'Persiapan stok waterproofing menjelang musim hujan.',
    products: [{ sku: 'FLSB-STD', quantity: 200 }, { sku: 'ONDB-STD', quantity: 100 }],
  },

  // CUST-0009 -- Kantor Kelurahan Rungkut Surabaya
  {
    clientIdCustomer: 'CUST-0009', name: 'Perbaikan Atap Gedung Kelurahan',
    ownerEmail: 'sales@salesmonitor.com', territoryName: 'Surabaya',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-03-01', closeDate: '2026-04-15', actualCloseDate: '2026-04-15',
    source: 'Tender Pemerintah', description: 'Perbaikan atap gedung kelurahan lewat proses tender.',
    products: [{ sku: 'ONDUC-BLK', quantity: 200 }],
  },
  {
    clientIdCustomer: 'CUST-0009', name: 'Panel Surya Gedung Pemerintah',
    ownerEmail: 'sales@salesmonitor.com', territoryName: 'Surabaya',
    stage: 'prospecting', status: 'open',
    createdDate: '2026-08-20', closeDate: '2026-12-15',
    source: 'Tender Pemerintah', description: 'Penjajakan program hemat energi gedung pemerintah.',
    products: [{ sku: 'OSCL-450', quantity: 10 }],
  },

  // CUST-0010 -- Villa Puncak Bogor
  {
    clientIdCustomer: 'CUST-0010', name: 'Renovasi Atap Villa',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-01-05', closeDate: '2026-01-30', actualCloseDate: '2026-01-30',
    source: 'Referral', description: 'Renovasi atap villa pribadi, termasuk skylight.',
    products: [{ sku: 'ONDV-SR', quantity: 150 }, { sku: 'SKYL-STD', quantity: 5 }],
  },
  {
    clientIdCustomer: 'CUST-0010', name: 'Waterproofing Kolam Renang',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-lost', status: 'lost',
    createdDate: '2026-06-10', closeDate: '2026-07-25', actualCloseDate: '2026-07-25',
    source: 'Existing Client', description: 'Pemilik menunda proyek kolam renang tanpa batas waktu.',
    products: [{ sku: 'EVLV-15', quantity: 30 }],
  },

  // CUST-0011 -- CV Karya Atap Bogor
  {
    clientIdCustomer: 'CUST-0011', name: 'Proyek Ruko 5 Unit Bogor',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'closed-lost', status: 'lost',
    createdDate: '2026-04-20', closeDate: '2026-05-30', actualCloseDate: '2026-05-30',
    source: 'Cold Call', description: 'Kalah tender dari kompetitor dengan harga lebih rendah.',
    products: [{ sku: 'BARD-GRY', quantity: 400 }],
  },
  {
    clientIdCustomer: 'CUST-0011', name: 'Renovasi Gudang Distribusi',
    ownerEmail: 'andiko@gmail.com', territoryName: 'Bandung',
    stage: 'negotiation', status: 'open',
    createdDate: '2026-08-25', closeDate: '2026-10-20',
    source: 'Existing Client', description: 'Renovasi atap gudang distribusi milik klien.',
    products: [{ sku: 'ONDC-BRN', quantity: 350 }],
  },

  // CUST-0012 -- Toko Bangunan Makmur Cibinong
  {
    clientIdCustomer: 'CUST-0012', name: 'Restock Genteng & Aksesoris',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Bandung',
    stage: 'closed-won', status: 'won',
    createdDate: '2026-05-15', closeDate: '2026-06-25', actualCloseDate: '2026-06-25',
    source: 'Existing Client', description: 'Restock genteng dan aksesoris untuk stok toko.',
    products: [{ sku: 'ONDT-TRC', quantity: 250 }, { sku: 'VPOV-STD', quantity: 40 }],
  },
  {
    clientIdCustomer: 'CUST-0012', name: 'Order Genteng Musim Hujan',
    ownerEmail: 'nikky@gmail.com', territoryName: 'Bandung',
    stage: 'proposal', status: 'open',
    createdDate: '2026-09-12', closeDate: '2026-11-05',
    source: 'Existing Client', description: 'Persiapan stok genteng menjelang musim hujan.',
    products: [{ sku: 'ONDC-BRN', quantity: 300 }],
  },
];
