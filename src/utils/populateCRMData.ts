/**
 * Populate CRM Dummy Data to LocalStorage
 * This creates realistic dummy data for Sales Representative, Clients, and Partners.
 *
 * Fase 1 (23 Sep 2026): this used to also seed a `productsDummyData` array
 * into 'sales_monitoring_products' -- leftover from before Products was
 * migrated to the real Postgres-backed catalog (see productsRepository.ts /
 * ProductCatalog.tsx). Nothing reads that key anymore, so it was removed
 * rather than reworded. Employees/Clients/Partners/Contracts below stay
 * localStorage-backed for now (Fase 1 item 2 is still migrating them one
 * module at a time), so their content was rewritten to match Onduline's
 * actual business (roofing, waterproofing, solar, green roof, accessories)
 * instead of the leftover hospital/HMS-software dummy data this template
 * shipped with.
 */

// LocalStorage Keys
const LS_KEYS = {
  EMPLOYEES: 'sales_monitoring_employees',
  CLIENTS: 'sales_monitoring_clients',
  PARTNERS: 'sales_monitoring_partners',
  CONTRACTS: 'sales_monitoring_contracts',
  // Demos have their own, separately-owned initializer -- see initializeDemos.ts.
};

// Helper function to generate ID
const generateId = () => crypto.randomUUID();

// Helper function to generate ID Customer (format: CUS-YYYYMMDD-XXX)
const generateCustomerId = (index: number) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `CUS-${date}-${String(index).padStart(3, '0')}`;
};

// Helper function to generate Contract Number (format: CTR-YYYY-MMDD-XXX)
const generateContractNumber = (index: number) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `CTR-${year}-${month}${day}-${String(index).padStart(3, '0')}`;
};

// ===== SALES REPRESENTATIVE DUMMY DATA =====
const salesRepresentativeDummyData = [
  {
    id: generateId(),
    nama_lengkap: 'Budi Santoso',
    nik: '3201012345678901',
    tempat_lahir: 'Jakarta',
    tanggal_lahir: '1990-05-15',
    jenis_kelamin: 'Laki-laki',
    alamat: 'Jl. Sudirman No. 123, Jakarta Selatan',
    nomor_wa: '081234567890',
    email_pribadi: 'budi.santoso@gmail.com',
    divisi: 'Sales & Marketing',
    jabatan: 'Senior Sales Executive',
    level_jabatan: 'Senior',
    status_karyawan: 'Tetap',
    tanggal_bergabung: '2020-01-15',
    nama_atasan: 'Andi Wijaya',
    npwp: '12.345.678.9-012.000',
    nomor_rekening: '1234567890',
    nama_bank: 'BCA',
    bpjs_ketenagakerjaan: '12345678901',
    bpjs_kesehatan: '0001234567890',
    email_kantor: 'budi.santoso@onduline.co.id',
    nda_signed: true,
    tanggal_nda: '2020-01-10',
    level_akses: 'Sales Executive',
    aset_perusahaan: 'Laptop Dell XPS 15',
  },
  {
    id: generateId(),
    nama_lengkap: 'Siti Nurhaliza',
    nik: '3201012345678902',
    tempat_lahir: 'Bandung',
    tanggal_lahir: '1992-08-22',
    jenis_kelamin: 'Perempuan',
    alamat: 'Jl. Merdeka No. 45, Bandung',
    nomor_wa: '081234567891',
    email_pribadi: 'siti.nurhaliza@gmail.com',
    divisi: 'Sales & Marketing',
    jabatan: 'Sales Executive',
    level_jabatan: 'Mid',
    status_karyawan: 'Tetap',
    tanggal_bergabung: '2021-03-10',
    nama_atasan: 'Budi Santoso',
    npwp: '12.345.678.9-012.001',
    nomor_rekening: '1234567891',
    nama_bank: 'Mandiri',
    bpjs_ketenagakerjaan: '12345678902',
    bpjs_kesehatan: '0001234567891',
    email_kantor: 'siti.nurhaliza@onduline.co.id',
    nda_signed: true,
    tanggal_nda: '2021-03-05',
    level_akses: 'Sales Executive',
    aset_perusahaan: 'Laptop Lenovo ThinkPad',
  },
  {
    id: generateId(),
    nama_lengkap: 'Andi Wijaya',
    nik: '3201012345678903',
    tempat_lahir: 'Surabaya',
    tanggal_lahir: '1985-12-10',
    jenis_kelamin: 'Laki-laki',
    alamat: 'Jl. Gatot Subroto No. 88, Jakarta Pusat',
    nomor_wa: '081234567892',
    email_pribadi: 'andi.wijaya@gmail.com',
    divisi: 'Sales & Marketing',
    jabatan: 'Sales Manager',
    level_jabatan: 'Manager',
    status_karyawan: 'Tetap',
    tanggal_bergabung: '2018-06-01',
    nama_atasan: 'Direktur Sales',
    npwp: '12.345.678.9-012.002',
    nomor_rekening: '1234567892',
    nama_bank: 'BCA',
    bpjs_ketenagakerjaan: '12345678903',
    bpjs_kesehatan: '0001234567892',
    email_kantor: 'andi.wijaya@onduline.co.id',
    nda_signed: true,
    tanggal_nda: '2018-05-25',
    level_akses: 'Manager',
    aset_perusahaan: 'Laptop MacBook Pro, iPhone 14',
  },
  {
    id: generateId(),
    nama_lengkap: 'Dewi Lestari',
    nik: '3201012345678904',
    tempat_lahir: 'Yogyakarta',
    tanggal_lahir: '1995-03-18',
    jenis_kelamin: 'Perempuan',
    alamat: 'Jl. Thamrin No. 67, Jakarta Pusat',
    nomor_wa: '081234567893',
    email_pribadi: 'dewi.lestari@gmail.com',
    divisi: 'Sales & Marketing',
    jabatan: 'Junior Sales Executive',
    level_jabatan: 'Junior',
    status_karyawan: 'Kontrak',
    tanggal_bergabung: '2024-01-15',
    nama_atasan: 'Budi Santoso',
    npwp: '12.345.678.9-012.003',
    nomor_rekening: '1234567893',
    nama_bank: 'BNI',
    bpjs_ketenagakerjaan: '12345678904',
    bpjs_kesehatan: '0001234567893',
    email_kantor: 'dewi.lestari@onduline.co.id',
    nda_signed: true,
    tanggal_nda: '2024-01-10',
    level_akses: 'Sales Executive',
    aset_perusahaan: 'Laptop Asus VivoBook',
  },
  {
    id: generateId(),
    nama_lengkap: 'Rudi Hartono',
    nik: '3201012345678905',
    tempat_lahir: 'Semarang',
    tanggal_lahir: '1988-07-25',
    jenis_kelamin: 'Laki-laki',
    alamat: 'Jl. HR Rasuna Said No. 12, Jakarta Selatan',
    nomor_wa: '081234567894',
    email_pribadi: 'rudi.hartono@gmail.com',
    divisi: 'Sales & Marketing',
    jabatan: 'Account Manager',
    level_jabatan: 'Senior',
    status_karyawan: 'Tetap',
    tanggal_bergabung: '2019-09-01',
    nama_atasan: 'Andi Wijaya',
    npwp: '12.345.678.9-012.004',
    nomor_rekening: '1234567894',
    nama_bank: 'BCA',
    bpjs_ketenagakerjaan: '12345678905',
    bpjs_kesehatan: '0001234567894',
    email_kantor: 'rudi.hartono@onduline.co.id',
    nda_signed: true,
    tanggal_nda: '2019-08-25',
    level_akses: 'Sales Executive',
    aset_perusahaan: 'Laptop Dell Latitude, iPad Pro',
  },
];

// ===== CLIENTS DUMMY DATA =====
// Fase 1 (23 Sep 2026): rewritten from the original hospital/klinik template
// data to Onduline's real customer segments (toko bahan bangunan, developer
// properti, kontraktor proyek, hotel/resort, pertanian/perkebunan). Fields
// that only make sense for a healthcare facility (Satu Sehat ID, faskes
// BPJS ID, akreditasi, jumlah tempat tidur, volume pasien) are kept on the
// object -- the Client model/type still has them (Fase 1 item 5, unifying
// the data model, hasn't happened yet) -- but set to '-' since they don't
// apply to a building-materials customer.
const clientsDummyData = [
  {
    id: generateId(),
    id_customer: generateCustomerId(1),
    nama_entitas: 'Toko Bangunan Makmur Jaya',
    kategori_client: 'Toko Bahan Bangunan',
    alamat_lengkap: 'Jl. Raya Bogor No. 45, Jakarta Timur, DKI Jakarta 13750',
    koordinat_gps: '-6.3729, 106.8798',
    nomor_telepon: '021-8701234',
    email_resmi: 'info@makmurjayabangunan.co.id',
    vendor_sebelumnya: 'Pemesanan manual via telepon/WhatsApp ke sales lama',
    nama_pic: 'Bapak Hendra Wijaya',
    jabatan_pic: 'Pemilik Toko',
    whatsapp_pic: '081234567800',
    status_hubungan: 'Active Client',
    paket_aktif: 'Onduline Classic + Aksesoris Pemasangan',
    modul_tambahan: 'Stok reguler bulanan, display produk',
    status_kontrak: 'Active',
    tanggal_mulai_langganan: '2023-01-15',
    tanggal_habis_kontrak: '2026-01-14',
    total_nilai_kontrak: 'Rp 850.000.000',
    file_kontrak_digital: 'kontrak_toko_makmur_jaya_2023.pdf',
    status_esign: 'Signed',
    npwp: '01.234.567.8-901.000',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(2),
    nama_entitas: 'Toko Material Sumber Rejeki',
    kategori_client: 'Toko Bahan Bangunan',
    alamat_lengkap: 'Jl. Ahmad Yani No. 12, Bandung, Jawa Barat 40123',
    koordinat_gps: '-6.9175, 107.6191',
    nomor_telepon: '022-5551234',
    email_resmi: 'sumberrejeki.material@gmail.com',
    vendor_sebelumnya: 'Excel/spreadsheet internal',
    nama_pic: 'Ibu Ratna Kartika',
    jabatan_pic: 'Kepala Toko',
    whatsapp_pic: '081234567801',
    status_hubungan: 'Hot',
    paket_aktif: '-',
    modul_tambahan: '-',
    status_kontrak: 'Proposal Sent',
    tanggal_mulai_langganan: '-',
    tanggal_habis_kontrak: '-',
    total_nilai_kontrak: 'Rp 120.000.000 (Proposal)',
    file_kontrak_digital: '-',
    status_esign: 'Pending',
    npwp: '02.345.678.9-012.000',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(3),
    nama_entitas: 'PT Kontraktor Bangun Persada',
    kategori_client: 'Kontraktor Proyek',
    alamat_lengkap: 'Jl. Ahmad Yani No. 88, Surabaya, Jawa Timur 60234',
    koordinat_gps: '-7.2575, 112.7521',
    nomor_telepon: '031-5551234',
    email_resmi: 'procurement@bangunpersada.co.id',
    vendor_sebelumnya: 'Kompetitor (distributor atap lain)',
    nama_pic: 'Bambang Sutrisno, S.T.',
    jabatan_pic: 'Project Manager',
    whatsapp_pic: '081234567802',
    status_hubungan: 'Active Client',
    paket_aktif: 'Onduline Bitumen + Ondugreen Roof System',
    modul_tambahan: 'Pengiriman proyek bertahap, konsultasi teknis on-site',
    status_kontrak: 'Active',
    tanggal_mulai_langganan: '2022-06-01',
    tanggal_habis_kontrak: '2025-05-31',
    total_nilai_kontrak: 'Rp 3.200.000.000',
    file_kontrak_digital: 'kontrak_bangun_persada_2022.pdf',
    status_esign: 'Signed',
    npwp: '03.456.789.0-123.000',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(4),
    nama_entitas: 'PT Agro Lestari Nusantara',
    kategori_client: 'Pertanian & Perkebunan',
    alamat_lengkap: 'Jl. Raya Cibinong No. 1, Bogor, Jawa Barat 16914',
    koordinat_gps: '-6.4817, 106.8542',
    nomor_telepon: '021-5559876',
    email_resmi: 'facility@agrolestari.co.id',
    vendor_sebelumnya: 'Belum ada distributor tetap',
    nama_pic: 'Hendra Gunawan',
    jabatan_pic: 'Manajer Fasilitas',
    whatsapp_pic: '081234567803',
    status_hubungan: 'Warm',
    paket_aktif: '-',
    modul_tambahan: '-',
    status_kontrak: 'Demo Scheduled',
    tanggal_mulai_langganan: '-',
    tanggal_habis_kontrak: '-',
    total_nilai_kontrak: 'Rp 210.000.000 (Estimate)',
    file_kontrak_digital: '-',
    status_esign: 'Pending',
    npwp: '04.567.890.1-234.000',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(5),
    nama_entitas: 'CV Rumah Idaman Bersama',
    kategori_client: 'Kontraktor Perumahan',
    alamat_lengkap: 'Jl. Kebon Jeruk Raya No. 27, Jakarta Barat, DKI Jakarta 11530',
    koordinat_gps: '-6.1895, 106.7826',
    nomor_telepon: '021-5554321',
    email_resmi: 'info@rumahidamanbersama.com',
    vendor_sebelumnya: 'Manual',
    nama_pic: 'Lisa Permata Sari',
    jabatan_pic: 'Pemilik Usaha',
    whatsapp_pic: '081234567804',
    status_hubungan: 'Cold',
    paket_aktif: '-',
    modul_tambahan: '-',
    status_kontrak: 'Initial Contact',
    tanggal_mulai_langganan: '-',
    tanggal_habis_kontrak: '-',
    total_nilai_kontrak: 'Rp 65.000.000 (Estimate)',
    file_kontrak_digital: '-',
    status_esign: 'Pending',
    npwp: '05.678.901.2-345.000',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(6),
    nama_entitas: 'Resort & Villa Ciwidey',
    kategori_client: 'Hotel & Resort',
    alamat_lengkap: 'Jl. Bintaro Utama No. 1, Tangerang Selatan, Banten 15224',
    koordinat_gps: '-6.2684, 106.7376',
    nomor_telepon: '021-7456789',
    email_resmi: 'facility@villaciwidey.co.id',
    vendor_sebelumnya: 'Kompetitor (Atap Metal Prima)',
    nama_pic: 'Ir. Johanes Surya',
    jabatan_pic: 'General Manager',
    whatsapp_pic: '081234567805',
    status_hubungan: 'Hot',
    paket_aktif: '-',
    modul_tambahan: '-',
    status_kontrak: 'Negotiation',
    tanggal_mulai_langganan: '-',
    tanggal_habis_kontrak: '-',
    total_nilai_kontrak: 'Rp 1.800.000.000 (Proposal)',
    file_kontrak_digital: '-',
    status_esign: 'Pending',
    npwp: '06.789.012.3-456.000',
  },
];

// ===== PARTNERS DUMMY DATA =====
// Fase 1 (23 Sep 2026): rewritten to Onduline's actual partner ecosystem
// (distributor regional, aplikator/installer, konsultan konstruksi, vendor
// aksesoris) instead of the original healthcare-IT-reseller template data.
const partnersDummyData = [
  {
    id: generateId(),
    id_customer: generateCustomerId(101),
    nama_perusahaan: 'PT Distribusi Bangunan Nusantara',
    tipe_partner: 'Reseller',
    spesialisasi: 'Distribusi Material Atap & Waterproofing Regional',
    account_manager_internal: 'Rudi Hartono',
    pic_partner: 'Hendra Kusuma',
    kontak_darurat: '081234567900',
    alamat_kantor: 'Jl. TB Simatupang No. 88, Jakarta Selatan, DKI Jakarta 12430',
    status_kemitraan: 'Active',
    masa_berlaku_mou_start: '2023-01-01',
    masa_berlaku_mou_end: '2026-12-31',
    file_mou_nda: 'mou_distribusi_bangunan_nusantara_2023.pdf',
    tingkat_kemitraan: 'Platinum',
    api_endpoint: 'https://api.distribusibangunan.com/v1',
    api_key_reference: 'DBN-API-2023-XXXXX',
    sla_requirement: 'Pengiriman < 7 hari, respons klaim < 2 jam',
    status_integrasi: 'Integrated',
    skema_komisi: '15% per deal closed',
    total_leads_generated: '45',
    total_revenue_contribution: 'Rp 1.250.000.000',
    rekening_pembayaran: 'BCA 1234567890 a/n PT Distribusi Bangunan Nusantara',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(102),
    nama_perusahaan: 'CV Aplikator Atap Profesional',
    tipe_partner: 'Integrator',
    spesialisasi: 'Jasa Pemasangan Atap & Waterproofing',
    account_manager_internal: 'Budi Santoso',
    pic_partner: 'Ir. Suryanto, M.T.',
    kontak_darurat: '081234567901',
    alamat_kantor: 'Jl. Sudirman No. 234, Bandung, Jawa Barat 40123',
    status_kemitraan: 'Active',
    masa_berlaku_mou_start: '2022-06-01',
    masa_berlaku_mou_end: '2025-05-31',
    file_mou_nda: 'mou_aplikator_atap_profesional_2022.pdf',
    tingkat_kemitraan: 'Gold',
    api_endpoint: 'https://api.aplikatoratap.id/integration',
    api_key_reference: 'AAP-API-2022-XXXXX',
    sla_requirement: 'Pemasangan selesai < 14 hari, garansi 2 tahun',
    status_integrasi: 'Integrated',
    skema_komisi: '10% per proyek pemasangan',
    total_leads_generated: '28',
    total_revenue_contribution: 'Rp 850.000.000',
    rekening_pembayaran: 'Mandiri 9876543210 a/n CV Aplikator Atap Profesional',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(103),
    nama_perusahaan: 'PT Konsultan Konstruksi Prima',
    tipe_partner: 'Consultant',
    spesialisasi: 'Konsultasi Struktur & Konstruksi Atap',
    account_manager_internal: 'Andi Wijaya',
    pic_partner: 'Dr. Ir. Maria Susanti',
    kontak_darurat: '081234567902',
    alamat_kantor: 'Jl. Thamrin No. 56, Jakarta Pusat, DKI Jakarta 10350',
    status_kemitraan: 'Active',
    masa_berlaku_mou_start: '2023-03-01',
    masa_berlaku_mou_end: '2026-02-28',
    file_mou_nda: 'mou_konsultan_konstruksi_prima_2023.pdf',
    tingkat_kemitraan: 'Gold',
    api_endpoint: '-',
    api_key_reference: '-',
    sla_requirement: 'SLA berbasis proyek',
    status_integrasi: 'N/A',
    skema_komisi: '12% per proyek konsultasi',
    total_leads_generated: '18',
    total_revenue_contribution: 'Rp 620.000.000',
    rekening_pembayaran: 'BNI 5432109876 a/n PT Konsultan Konstruksi Prima',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(104),
    nama_perusahaan: 'PT Aksesoris Bangunan Sejahtera',
    tipe_partner: 'Vendor',
    spesialisasi: 'Aksesoris Pemasangan & Perlengkapan Atap',
    account_manager_internal: 'Siti Nurhaliza',
    pic_partner: 'Bambang Prasetyo',
    kontak_darurat: '081234567903',
    alamat_kantor: 'Jl. Gatot Subroto No. 120, Surabaya, Jawa Timur 60285',
    status_kemitraan: 'Active',
    masa_berlaku_mou_start: '2021-09-01',
    masa_berlaku_mou_end: '2024-08-31',
    file_mou_nda: 'mou_aksesoris_bangunan_sejahtera_2021.pdf',
    tingkat_kemitraan: 'Silver',
    api_endpoint: 'https://api.aksesorisbangunan.co.id/catalog',
    api_key_reference: 'ABS-API-2021-XXXXX',
    sla_requirement: 'Pengiriman < 14 hari, garansi 2 tahun',
    status_integrasi: 'Pending',
    skema_komisi: '8% per penjualan aksesoris',
    total_leads_generated: '12',
    total_revenue_contribution: 'Rp 450.000.000',
    rekening_pembayaran: 'BCA 7890123456 a/n PT Aksesoris Bangunan Sejahtera',
  },
  {
    id: generateId(),
    id_customer: generateCustomerId(105),
    nama_perusahaan: 'CV Pelatihan Aplikator Profesional',
    tipe_partner: 'Consultant',
    spesialisasi: 'Pelatihan Teknik Pemasangan Aplikator',
    account_manager_internal: 'Dewi Lestari',
    pic_partner: 'Prof. Dr. Ahmad Rizki',
    kontak_darurat: '081234567904',
    alamat_kantor: 'Jl. Diponegoro No. 78, Yogyakarta, DIY 55221',
    status_kemitraan: 'Pending',
    masa_berlaku_mou_start: '2024-01-01',
    masa_berlaku_mou_end: '2027-12-31',
    file_mou_nda: 'draft_mou_pelatihan_aplikator_2024.pdf',
    tingkat_kemitraan: 'Bronze',
    api_endpoint: '-',
    api_key_reference: '-',
    sla_requirement: 'Pelatihan terjadwal < 30 hari notice',
    status_integrasi: 'N/A',
    skema_komisi: '10% per paket pelatihan',
    total_leads_generated: '5',
    total_revenue_contribution: 'Rp 180.000.000',
    rekening_pembayaran: 'Mandiri 3456789012 a/n CV Pelatihan Aplikator Profesional',
  },
];

// ===== CONTRACTS DUMMY DATA =====
// Fase 1 (23 Sep 2026): rewritten to roofing/waterproofing/solar supply
// agreements against the clients above, instead of the original HMS
// software-subscription template contracts.
const contractsDummyData = [
  {
    id: generateId(),
    contractNumber: generateContractNumber(1),
    clientName: 'Toko Bangunan Makmur Jaya',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Classic + Aksesoris Pemasangan',
    value: 850000000,
    startDate: new Date('2023-01-15'),
    endDate: new Date('2026-01-14'),
    status: 'active' as const,
    signedBy: 'Hendra Wijaya',
    salesPerson: 'Budi Santoso',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(2),
    clientName: 'PT Kontraktor Bangun Persada',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Bitumen + Ondugreen Roof System',
    value: 3200000000,
    startDate: new Date('2022-06-01'),
    endDate: new Date('2025-05-31'),
    status: 'active' as const,
    signedBy: 'Bambang Sutrisno, S.T.',
    salesPerson: 'Rudi Hartono',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(3),
    clientName: 'Toko Material Sumber Rejeki',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Classic + Waterproofing Membrane',
    value: 120000000,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2029-02-28'),
    status: 'pending' as const,
    signedBy: 'Ratna Kartika',
    salesPerson: 'Siti Nurhaliza',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(4),
    clientName: 'Resort & Villa Ciwidey',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Bitumen + Ondusolar Panel Kit + Ondugreen',
    value: 1800000000,
    startDate: new Date('2026-02-15'),
    endDate: new Date('2029-02-14'),
    status: 'pending' as const,
    signedBy: 'Ir. Johanes Surya',
    salesPerson: 'Andi Wijaya',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(5),
    clientName: 'PT Agro Lestari Nusantara',
    company: 'PT Onduline Indonesia',
    product: 'Ondugreen Roof System + Aksesoris Pemasangan',
    value: 210000000,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2028-08-31'),
    status: 'draft' as const,
    signedBy: 'Hendra Gunawan',
    salesPerson: 'Dewi Lestari',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(6),
    clientName: 'PT Graha Properti Sentosa',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Bitumen + Waterproofing Membrane + Ondusolar',
    value: 4200000000,
    startDate: new Date('2021-03-01'),
    endDate: new Date('2024-02-29'),
    status: 'expired' as const,
    signedBy: 'Caroline Halim',
    salesPerson: 'Budi Santoso',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(7),
    clientName: 'Toko Bangunan Sumber Makmur Bekasi',
    company: 'PT Onduline Indonesia',
    product: 'Waterproofing Membrane + Aksesoris Pemasangan',
    value: 95000000,
    startDate: new Date('2024-06-01'),
    endDate: new Date('2026-05-31'),
    status: 'active' as const,
    signedBy: 'Rina Wijayanti',
    salesPerson: 'Siti Nurhaliza',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(8),
    clientName: 'PT Kontraktor Depok Sejahtera',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Classic + Aksesoris Pemasangan',
    value: 1800000000,
    startDate: new Date('2023-10-01'),
    endDate: new Date('2026-09-30'),
    status: 'active' as const,
    signedBy: 'Hadi Sutrisno',
    salesPerson: 'Rudi Hartono',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(9),
    clientName: 'PT Properti Graha Mandiri',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Full Suite (Atap + Waterproofing + Solar)',
    value: 7500000000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2027-12-31'),
    status: 'active' as const,
    signedBy: 'Adib Khumaidi',
    salesPerson: 'Andi Wijaya',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(10),
    clientName: 'Toko Bangunan Pratama Mandiri',
    company: 'PT Onduline Indonesia',
    product: 'Waterproofing Membrane',
    value: 55000000,
    startDate: new Date('2022-04-15'),
    endDate: new Date('2025-04-14'),
    status: 'active' as const,
    signedBy: 'Rini Handayani',
    salesPerson: 'Dewi Lestari',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(11),
    clientName: 'PT Mayapada Developer',
    company: 'PT Onduline Indonesia',
    product: 'Onduline Bitumen + Ondusolar Panel Kit + Waterproofing',
    value: 3800000000,
    startDate: new Date('2020-08-01'),
    endDate: new Date('2023-07-31'),
    status: 'terminated' as const,
    signedBy: 'Jonathan Tahir',
    salesPerson: 'Budi Santoso',
  },
  {
    id: generateId(),
    contractNumber: generateContractNumber(12),
    clientName: 'CV Rumah Idaman Bersama',
    company: 'PT Onduline Indonesia',
    product: 'Ondusolar Panel Kit + Waterproofing Membrane',
    value: 65000000,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2028-11-30'),
    status: 'draft' as const,
    signedBy: 'Lisa Permata Sari',
    salesPerson: 'Siti Nurhaliza',
  },
];

/**
 * Populate CRM data to localStorage
 */
export function populateCRMToLocalStorage(): {
  success: boolean;
  message: string;
  data: {
    employees: number;
    clients: number;
    partners: number;
    contracts: number;
  };
} {
  try {
    // Save to localStorage
    localStorage.setItem(LS_KEYS.EMPLOYEES, JSON.stringify(salesRepresentativeDummyData));
    localStorage.setItem(LS_KEYS.CLIENTS, JSON.stringify(clientsDummyData));
    localStorage.setItem(LS_KEYS.PARTNERS, JSON.stringify(partnersDummyData));
    localStorage.setItem(LS_KEYS.CONTRACTS, JSON.stringify(contractsDummyData));

    console.log('✅ CRM Dummy Data populated successfully to localStorage');
    console.log(`📊 Employees: ${salesRepresentativeDummyData.length}`);

    return {
      success: true,
      message: 'CRM data (including Contracts) populated successfully!',
      data: {
        employees: salesRepresentativeDummyData.length,
        clients: clientsDummyData.length,
        partners: partnersDummyData.length,
        contracts: contractsDummyData.length,
      },
    };
  } catch (error) {
    console.error('❌ Error populating CRM data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to populate CRM data',
      data: {
        employees: 0,
        clients: 0,
        partners: 0,
        contracts: 0,
      },
    };
  }
}

/**
 * Clear CRM data from localStorage
 */
export function clearCRMFromLocalStorage(): {
  success: boolean;
  message: string;
} {
  try {
    localStorage.removeItem(LS_KEYS.EMPLOYEES);
    localStorage.removeItem(LS_KEYS.CLIENTS);
    localStorage.removeItem(LS_KEYS.PARTNERS);
    localStorage.removeItem(LS_KEYS.CONTRACTS);

    console.log('🗑️ CRM data (including Contracts) cleared from localStorage');

    return {
      success: true,
      message: 'CRM data cleared successfully!',
    };
  } catch (error) {
    console.error('❌ Error clearing CRM data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear CRM data',
    };
  }
}

/**
 * Get CRM data statistics from localStorage
 */
export function getCRMStatistics(): {
  employees: number;
  clients: number;
  partners: number;
  contracts: number;
} {
  try {
    const employees = JSON.parse(localStorage.getItem(LS_KEYS.EMPLOYEES) || '[]');
    const clients = JSON.parse(localStorage.getItem(LS_KEYS.CLIENTS) || '[]');
    const partners = JSON.parse(localStorage.getItem(LS_KEYS.PARTNERS) || '[]');
    const contracts = JSON.parse(localStorage.getItem(LS_KEYS.CONTRACTS) || '[]');

    return {
      employees: employees.length,
      clients: clients.length,
      partners: partners.length,
      contracts: contracts.length,
    };
  } catch (error) {
    console.error('❌ Error getting CRM statistics:', error);
    return {
      employees: 0,
      clients: 0,
      partners: 0,
      contracts: 0,
    };
  }
}
