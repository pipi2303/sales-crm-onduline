// Bab 16.5 lanjutan (24 Sep 2026): contoh data Organisation Tree/
// Influence Map + Customer Intelligence untuk demo -- menutup gap "belum
// ada data contoh" yang ditemukan setelah fitur ini selesai dibangun.
//
// SENGAJA cuma untuk 4 dari 12 client yang sudah ada (CUST-0001, 0003,
// 0007, 0009) -- semuanya proyek B2B (Kontraktor/Developer/Instansi)
// yang realistis punya banyak stakeholder, bukan toko/end-user kecil yang
// biasanya cuma 1 PIC. Ini juga mencerminkan kenyataan produk: tidak
// semua Client akan langsung diisi org tree lengkap (lihat catatan
// desain di prisma/schema.prisma), jadi 8 client lain sengaja dibiarkan
// kosong seperti yang akan terjadi di pemakaian nyata.
//
// reportsToNama di-resolve di seed.ts dengan mencari kontak lain yang
// clientIdCustomer + nama-nya cocok (nama unik per client di sini, bukan
// PK sungguhan -- hanya dipakai untuk wiring seed).

export interface ClientContactSeed {
  clientIdCustomer: string;
  nama: string;
  jabatan: string;
  email?: string;
  telepon?: string;
  whatsapp?: string;
  influenceRole: 'DECISION_MAKER' | 'APPROVER' | 'INFLUENCER' | 'TECHNICAL_ADVISOR' | 'CONSULTANT';
  relationshipStatus: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  closeness: 'BARU_KENAL' | 'KENAL_BAIK' | 'CHAMPION';
  reportsToNama?: string;
  notes?: string;
}

export const clientContactSeeds: ClientContactSeed[] = [
  // CUST-0001 -- PT Kontraktor Nusantara Jaya
  {
    clientIdCustomer: 'CUST-0001',
    nama: 'Bambang Wijaya',
    jabatan: 'Direktur',
    whatsapp: '081234560001',
    influenceRole: 'DECISION_MAKER',
    relationshipStatus: 'POSITIVE',
    closeness: 'CHAMPION',
    notes: 'Selalu jadi pengambil keputusan akhir untuk approval PO besar. Sama dengan PIC utama di data Client.',
  },
  {
    clientIdCustomer: 'CUST-0001',
    nama: 'Rudi Hartanto',
    jabatan: 'Site Manager',
    whatsapp: '081234560011',
    influenceRole: 'TECHNICAL_ADVISOR',
    relationshipStatus: 'NEUTRAL',
    closeness: 'KENAL_BAIK',
    reportsToNama: 'Bambang Wijaya',
    notes: 'Kontak teknis di lapangan, sering minta spesifikasi detail sebelum rekomendasi ke Direktur.',
  },
  {
    clientIdCustomer: 'CUST-0001',
    nama: 'Sinta Marlina',
    jabatan: 'Staff Purchasing',
    whatsapp: '081234560012',
    influenceRole: 'INFLUENCER',
    relationshipStatus: 'POSITIVE',
    closeness: 'BARU_KENAL',
    reportsToNama: 'Bambang Wijaya',
    notes: 'Baru mulai jadi kontak sejak Sep 2026, responsif soal follow-up penawaran.',
  },

  // CUST-0003 -- Perumahan Griya Asri
  {
    clientIdCustomer: 'CUST-0003',
    nama: 'Ratna Kusumawati',
    jabatan: 'Direktur Utama',
    email: 'ratna@griyaasribandung.co.id',
    influenceRole: 'DECISION_MAKER',
    relationshipStatus: 'POSITIVE',
    closeness: 'KENAL_BAIK',
    notes: 'Keputusan komersial & kontrak multi-tahap akhirnya lewat beliau, jarang bertemu langsung.',
  },
  {
    clientIdCustomer: 'CUST-0003',
    nama: 'Agus Setiawan',
    jabatan: 'Manajer Proyek',
    whatsapp: '081234560021',
    influenceRole: 'APPROVER',
    relationshipStatus: 'POSITIVE',
    closeness: 'CHAMPION',
    reportsToNama: 'Ratna Kusumawati',
    notes: 'Kontak harian untuk approval teknis & progress lapangan. Sama dengan PIC utama di data Client.',
  },

  // CUST-0007 -- PT Surya Konstruksi Surabaya
  {
    clientIdCustomer: 'CUST-0007',
    nama: 'Fajar Nugroho',
    jabatan: 'Direktur Operasional',
    whatsapp: '081234560031',
    influenceRole: 'DECISION_MAKER',
    relationshipStatus: 'POSITIVE',
    closeness: 'KENAL_BAIK',
    notes: 'Fokus ke harga kompetitif untuk proyek volume besar. Sama dengan PIC utama di data Client.',
  },
  {
    clientIdCustomer: 'CUST-0007',
    nama: 'Wahyu Setyo',
    jabatan: 'Quantity Surveyor',
    email: 'wahyu.setyo@suryakonstruksi.co.id',
    influenceRole: 'CONSULTANT',
    relationshipStatus: 'NEUTRAL',
    closeness: 'BARU_KENAL',
    reportsToNama: 'Fajar Nugroho',
    notes: 'Yang benar-benar menghitung volume & bandingkan harga antar vendor sebelum rekomendasi ke Direktur.',
  },

  // CUST-0009 -- Kantor Kelurahan Rungkut Surabaya
  {
    clientIdCustomer: 'CUST-0009',
    nama: 'Slamet Riyadi',
    jabatan: 'Lurah',
    influenceRole: 'DECISION_MAKER',
    relationshipStatus: 'NEUTRAL',
    closeness: 'BARU_KENAL',
    notes: 'Tanda tangan approval anggaran akhir wajib dari beliau, jarang terlibat teknis harian.',
  },
  {
    clientIdCustomer: 'CUST-0009',
    nama: 'Kartono',
    jabatan: 'Kepala Bagian Umum',
    whatsapp: '081234560041',
    influenceRole: 'APPROVER',
    relationshipStatus: 'POSITIVE',
    closeness: 'KENAL_BAIK',
    reportsToNama: 'Slamet Riyadi',
    notes: 'Kontak utama proses pengadaan. Sama dengan PIC utama di data Client.',
  },
  {
    clientIdCustomer: 'CUST-0009',
    nama: 'Siti Aminah',
    jabatan: 'Staff Pengadaan',
    influenceRole: 'INFLUENCER',
    relationshipStatus: 'NEUTRAL',
    closeness: 'BARU_KENAL',
    reportsToNama: 'Kartono',
    notes: 'Menyiapkan dokumen pembanding vendor untuk proses tender internal.',
  },
];

export interface ClientIntelligenceSeed {
  clientIdCustomer: string;
  profilBisnis?: string;
  proyekBerjalan?: string;
  kompetitorEksisting?: string;
  sumberInformasi?: string;
  catatanTambahan?: string;
}

export const clientIntelligenceSeeds: ClientIntelligenceSeed[] = [
  {
    clientIdCustomer: 'CUST-0001',
    profilBisnis: 'Kontraktor umum skala menengah, fokus proyek gudang & pabrik di Jabodetabek, sekitar 15-20 proyek per tahun.',
    proyekBerjalan: 'Sedang mengerjakan 2 proyek gudang logistik baru di Cikarang, estimasi selesai Q1 2027.',
    kompetitorEksisting: 'Pernah pakai atap merk lokal non-Onduline untuk proyek kecil; belum ada kontrak eksklusif dengan kompetitor manapun.',
    sumberInformasi: 'Referral dari Distributor DIST-JKT01, dikonfirmasi lewat obrolan langsung dengan Bambang saat kunjungan lapangan.',
    catatanTambahan: 'Potensi upsell ke lini Waterproofing untuk proyek gudang berikutnya.',
  },
  {
    clientIdCustomer: 'CUST-0003',
    profilBisnis: 'Developer perumahan menengah, proyek cluster 60-120 unit per fase, area Bandung.',
    proyekBerjalan: 'Cluster Tipe 36 tahap 1 (80 unit) sedang berjalan; tahap 2 direncanakan mulai Q2 2027.',
    kompetitorEksisting: 'Pernah menerima penawaran dari brand atap metal lain untuk cluster sebelumnya, belum deal.',
    sumberInformasi: 'Kunjungan sales rep + company profile di website developer.',
    catatanTambahan: 'Peluang kontrak multi-tahap kalau tahap 1 sukses -- prioritaskan layanan after-sales.',
  },
  {
    clientIdCustomer: 'CUST-0007',
    profilBisnis: 'Kontraktor konstruksi industri (gudang, pabrik) skala menengah-besar di Jawa Timur.',
    proyekBerjalan: 'Proyek gudang logistik Surabaya & renovasi pabrik tekstil berjalan paralel.',
    kompetitorEksisting: 'Aktif membandingkan harga dengan minimal 2 vendor atap lain di setiap tender.',
    sumberInformasi: 'Dari tim sales area Surabaya, dikonfirmasi lewat dokumen tender yang dibagikan client.',
    catatanTambahan: 'Sensitif harga -- pertimbangkan diskon volume untuk deal besar.',
  },
  {
    clientIdCustomer: 'CUST-0009',
    profilBisnis: 'Instansi pemerintah kelurahan, pengadaan mengikuti prosedur APBD/tender kecil.',
    proyekBerjalan: 'Perbaikan atap gedung kelurahan sedang berjalan; wacana panel surya gedung pemerintah masih tahap studi.',
    kompetitorEksisting: 'Pengadaan pemerintah wajib bandingkan minimal 3 vendor -- belum ada vendor tetap sebelumnya.',
    sumberInformasi: 'Proses tender/pengadaan resmi + komunikasi langsung dengan Kartono.',
    catatanTambahan: 'Proses approval lebih lambat karena birokrasi -- perlu follow-up rutin, jangan andalkan respons cepat.',
  },
];

export interface SampleMeetingSeed {
  clientIdCustomer: string;
  opportunityName: string;
  contactNama: string;
  type: string;
  description: string;
  daysAgo: number;
}

// Contoh aktivitas dengan contactId terisi, supaya "jumlah pertemuan" di
// ClientOrgTreePanel tidak selalu 0 di data demo.
export const sampleMeetingSeeds: SampleMeetingSeed[] = [
  {
    clientIdCustomer: 'CUST-0001',
    opportunityName: 'Renovasi Atap Gudang Kontraktor Nusantara',
    contactNama: 'Bambang Wijaya',
    type: 'meeting',
    description: 'Diskusi awal kebutuhan atap gudang, presentasi katalog produk Onduline.',
    daysAgo: 20,
  },
  {
    clientIdCustomer: 'CUST-0001',
    opportunityName: 'Proyek Perumahan Tahap 2 - Atap',
    contactNama: 'Rudi Hartanto',
    type: 'visit',
    description: 'Site visit teknis mengukur kebutuhan material untuk tahap 2.',
    daysAgo: 8,
  },
  {
    clientIdCustomer: 'CUST-0003',
    opportunityName: 'Atap Cluster Rumah Tipe 36 (80 unit)',
    contactNama: 'Agus Setiawan',
    type: 'meeting',
    description: 'Presentasi progress pemasangan atap tahap 1 ke manajemen developer.',
    daysAgo: 15,
  },
  {
    clientIdCustomer: 'CUST-0007',
    opportunityName: 'Proyek Gudang Logistik Surabaya',
    contactNama: 'Fajar Nugroho',
    type: 'call',
    description: 'Follow-up telepon negosiasi harga untuk proyek gudang logistik.',
    daysAgo: 5,
  },
  {
    clientIdCustomer: 'CUST-0009',
    opportunityName: 'Perbaikan Atap Gedung Kelurahan',
    contactNama: 'Kartono',
    type: 'meeting',
    description: 'Rapat koordinasi teknis pengadaan dengan bagian umum kelurahan.',
    daysAgo: 12,
  },
];
