// Client model -- moved out of ClientDetailDialog.tsx (Fase 1 item 5: one
// consistent definition in src/types instead of scattered across component
// files). Hospital/distributor-specific fields (koordinat_gps, id_satusehat,
// id_faskes_bpjs, etc.) per the Onduline FSD schema discussion (Bab 5).
// No field changes -- straight move, now exported for reuse.

export interface Client {
  id: string;
  id_customer: string; // NEW FIELD - ID Customer
  nama_entitas: string;
  kategori_client: string;
  owner: string;
  alamat_lengkap: string;
  koordinat_gps: string;
  nomor_telepon: string;
  email_resmi: string;
  id_satusehat: string;
  id_faskes_bpjs: string;
  status_akreditasi: string;
  sistem_lama: string;
  volume_pasien: string;
  jumlah_tempat_tidur: string;
  nama_pic: string;
  jabatan_pic: string;
  whatsapp_pic: string;
  status_hubungan: string;
  paket_aktif: string;
  modul_tambahan: string;
  status_kontrak: string;
  status_subscription?: string; // NEW FIELD
  tanggal_mulai_langganan: string;
  tanggal_habis_kontrak: string;
  total_nilai_kontrak: string;
  file_kontrak_digital: string;
  status_esign: string;
  npwp_faskes: string;

  // Bab 10 gap #1 ("Client tanpa approval workflow", 23 Sep 2026) -- same
  // shape as Distributor/Store's Bab 9 workflow, kept as plain strings
  // (not Date objects) to match every other field on this interface.
  status: 'pending' | 'approved' | 'rejected';
  submitted_by_id: string;
  submitted_at: string;
  decided_by_id: string;
  decided_at: string;
  rejection_note: string;
}
