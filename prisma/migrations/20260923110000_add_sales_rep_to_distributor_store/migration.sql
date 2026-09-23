-- Bab 12 follow-up (distribusi beban per sales rep, insight #7): tambah
-- kolom sales_rep_id di distributors & stores, menunjuk ke users(id) --
-- BUKAN ke tabel sales_reps (model SalesRep terpisah yang cuma dipakai
-- untuk performanceTargets/commissionRecords, tidak terhubung ke akun
-- login) dan BUKAN ke Karyawan (tidak ada tabel-nya sama sekali, masih
-- localStorage-only). Dipilih User supaya konsisten dengan pola FK yang
-- sudah ada di kedua tabel ini (submitted_by_id, decided_by_id) dan di
-- Opportunity.owner_id/Task.owner_id -- satu-satunya model "orang" yang
-- benar-benar terhubung ke akun login & RBAC.
--
-- Nullable (belum semua distributor/toko akan langsung punya PIC), jadi
-- TIDAK destruktif -- aman dijalankan tanpa downtime maupun backfill.
--
-- Harus dijalankan manual oleh user dengan `npx prisma migrate deploy`
-- diikuti `npx prisma generate` -- sandbox ini tidak bisa menjangkau
-- database Neon maupun binaries.prisma.sh untuk menjalankan keduanya.

-- AlterTable: distributors
ALTER TABLE "distributors" ADD COLUMN "sales_rep_id" TEXT;

ALTER TABLE "distributors"
  ADD CONSTRAINT "distributors_sales_rep_id_fkey"
  FOREIGN KEY ("sales_rep_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "distributors_sales_rep_id_idx" ON "distributors"("sales_rep_id");

-- AlterTable: stores
ALTER TABLE "stores" ADD COLUMN "sales_rep_id" TEXT;

ALTER TABLE "stores"
  ADD CONSTRAINT "stores_sales_rep_id_fkey"
  FOREIGN KEY ("sales_rep_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "stores_sales_rep_id_idx" ON "stores"("sales_rep_id");
