// Client model -- moved out of ClientDetailDialog.tsx (Fase 1 item 2: one
// consistent definition in src/types instead of scattered across component
// files).
//
// Fase 1 item 5 (unify Client data model, 23 Sep 2026): the healthcare/
// BPJS-only fields this interface used to carry (id_satusehat,
// id_faskes_bpjs, status_akreditasi, volume_pasien, jumlah_tempat_tidur)
// were removed -- Onduline sells building materials, not healthcare
// software, and has no equivalent concept. npwp_faskes and sistem_lama
// were kept and renamed (npwp, vendor_sebelumnya) since they map to real,
// generic business concepts every client has. See
// prisma/migrations/20260923100000_unify_client_data_model and
// src/utils/clientSegmentTier.ts.

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
  npwp: string;
  vendor_sebelumnya: string;

  // Bab 12 follow-up (insight #1/#6, 23 Sep 2026): sudah didukung penuh di
  // Prisma model & api/handler.ts (POST create + PUT editableFields) sejak
  // awal -- field ini murni menutup celah di layer frontend supaya
  // Client bisa di-join ke Distributor/Store untuk agregasi heatmap
  // performa & penetrasi kategori produk.
  distributor_id: string;
  store_id: string;

  // Bab 10 gap #1 ("Client tanpa approval workflow", 23 Sep 2026) -- same
  // shape as Distributor/Store's Bab 9 workflow, kept as plain strings
  // (not Date objects) to match every other field on this interface.
  status: 'pending' | 'approved' | 'rejected';
  submitted_by_id: string;
  submitted_at: string;
  decided_by_id: string;
  decided_at: string;
  rejection_note: string;

  // Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): ClientForm.tsx
  // has always collected these but they were silently dropped before the
  // FIELD_MAP/schema fix below -- see prisma/schema.prisma's Client model
  // for the full note.
  sektor_client?: string;
  alamat_pengiriman?: string;
  alamat_sama_dengan_penagihan?: boolean;
  website?: string;
  discount?: number;
  discount_status?: string;
  // '' | 'pending' | 'approved' | 'rejected' -- set only via
  // clientsRepository.requestDiscountApproval/decideDiscountApproval
  // (real backend actions), never by a plain update() call.
  discount_approval_status?: string;
  discount_approval_requested_at?: string;
  discount_approval_decided_by_id?: string;
  discount_approval_decided_at?: string;
}
