-- Bab 56: perbaiki mismatch huruf besar/kecil pada enum ContractStatus
-- dan QuotationStatus di database production.
--
-- Root cause laporan user "data di quote belum ada" (dan Contract juga
-- kosong): migration 20260924020000_add_contracts dan
-- 20260924030000_add_quotations membuat enum Postgres dengan value
-- UPPERCASE ('DRAFT', 'PENDING', dst). Setelah itu schema.prisma
-- diubah untuk memetakan value tsb ke lowercase lewat @map("draft")
-- dkk (comment di schema.prisma sendiri sudah memperingatkan migration
-- ini harus di-apply manual dari mesin dengan akses jaringan penuh --
-- belum pernah benar-benar dijalankan). Akibatnya Prisma Client hasil
-- generate dari schema yang baru itu SELALU mengirim string lowercase
-- ("draft", "active", dst) ke Postgres, padahal tipe enum di DB
-- production belum pernah diubah -- jadi SETIAP
-- prisma.contract.create()/quotation.create() (termasuk saat proses
-- "Load Dummy Data") gagal dengan error seperti:
--   invalid input value for enum "ContractStatus": "draft"
--   invalid input value for enum "QuotationStatus": "draft"
-- (dikonfirmasi lewat Vercel function logs, cluster POST 500 di kedua
-- endpoint /api/contracts dan /api/quotations).
--
-- RENAME VALUE dipakai (bukan DROP+CREATE TYPE) supaya aman untuk baris
-- yang mungkin sudah terlanjur tersimpan dengan value lama: Postgres
-- menyimpan value enum sebagai OID internal, RENAME VALUE cuma
-- mengganti label teksnya saja, jadi DEFAULT constraint & baris yang
-- sudah ada otomatis ikut valid dengan label baru tanpa perlu migrasi
-- data terpisah.

ALTER TYPE "ContractStatus" RENAME VALUE 'DRAFT' TO 'draft';
ALTER TYPE "ContractStatus" RENAME VALUE 'PENDING' TO 'pending';
ALTER TYPE "ContractStatus" RENAME VALUE 'ACTIVE' TO 'active';
ALTER TYPE "ContractStatus" RENAME VALUE 'EXPIRED' TO 'expired';
ALTER TYPE "ContractStatus" RENAME VALUE 'TERMINATED' TO 'terminated';

ALTER TYPE "QuotationStatus" RENAME VALUE 'DRAFT' TO 'draft';
ALTER TYPE "QuotationStatus" RENAME VALUE 'SENT' TO 'sent';
ALTER TYPE "QuotationStatus" RENAME VALUE 'APPROVED' TO 'approved';
ALTER TYPE "QuotationStatus" RENAME VALUE 'REJECTED' TO 'rejected';
ALTER TYPE "QuotationStatus" RENAME VALUE 'EXPIRED' TO 'expired';
ALTER TYPE "QuotationStatus" RENAME VALUE 'CANCELLED' TO 'cancelled';
