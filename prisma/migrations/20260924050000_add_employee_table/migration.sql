-- Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): real backend
-- home for the Sales Representative / HR personnel screen, which was
-- previously 100% localStorage-only (src/services/api.ts's employeesApi,
-- pointed at a mock Supabase project that was never actually reachable).

CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "nik" TEXT,
    "tempat_lahir" TEXT,
    "tanggal_lahir" TEXT,
    "jenis_kelamin" TEXT,
    "alamat" TEXT,
    "nomor_wa" TEXT,
    "email_pribadi" TEXT,
    "divisi" TEXT,
    "jabatan" TEXT,
    "level_jabatan" TEXT,
    "status_karyawan" TEXT,
    "tanggal_bergabung" TEXT,
    "nama_atasan" TEXT,
    "npwp" TEXT,
    "nomor_rekening" TEXT,
    "nama_bank" TEXT,
    "bpjs_ketenagakerjaan" TEXT,
    "bpjs_kesehatan" TEXT,
    "email_kantor" TEXT,
    "nda_signed" BOOLEAN NOT NULL DEFAULT false,
    "tanggal_nda" TEXT,
    "level_akses" TEXT,
    "aset_perusahaan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);
