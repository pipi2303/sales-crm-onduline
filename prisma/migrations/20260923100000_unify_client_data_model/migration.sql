-- Fase 1 item 5 ("unify Client data model"): removes the 5 client columns
-- that are pure healthcare/BPJS artifacts with no Onduline equivalent
-- (id_satusehat, id_faskes_bpjs, status_akreditasi, volume_pasien,
-- jumlah_tempat_tidur), and renames the 2 remaining columns that carried
-- real, generic business meaning under a healthcare-flavored name:
--   npwp_faskes -> npwp               (every business entity has an NPWP,
--                                      not just health facilities -- matches
--                                      the Karyawan model's own `npwp` field)
--   sistem_lama -> vendor_sebelumnya  (labelled "Sistem Lama / Eksisting
--                                      (SIMRS)" in the UI, but the dummy
--                                      values already stored here --
--                                      "Kompetitor (distributor atap
--                                      lain)", "Belum ada distributor
--                                      tetap" -- were always about the
--                                      client's prior vendor/purchasing
--                                      method, never a software system)
--
-- jumlah_tempat_tidur (bed count) was also silently feeding
-- AILeadScoring.tsx/AISmartRecommendations.tsx deal-size and lead-score
-- math -- see src/utils/clientSegmentTier.ts (new) for the Onduline
-- kategori_client-based replacement, and vendor_sebelumnya is now wired
-- into the competition-level factor instead of sitting unused.
--
-- All 7 columns are nullable, so unlike 20260923090000 (productType) this
-- drops no NOT NULL constraint and no related table -- lower risk, but
-- still DESTRUCTIVE for the 5 dropped columns. The 2 renames preserve
-- their data (RENAME COLUMN, not drop+recreate).
--
-- Must be applied with `npx prisma migrate deploy` followed by
-- `npx prisma generate` -- this sandbox cannot reach the Neon database or
-- binaries.prisma.sh to run either step itself.

-- AlterTable: drop pure-healthcare columns (no Onduline equivalent)
ALTER TABLE "clients" DROP COLUMN "id_satusehat";
ALTER TABLE "clients" DROP COLUMN "id_faskes_bpjs";
ALTER TABLE "clients" DROP COLUMN "status_akreditasi";
ALTER TABLE "clients" DROP COLUMN "volume_pasien";
ALTER TABLE "clients" DROP COLUMN "jumlah_tempat_tidur";

-- AlterTable: rename columns with generic business value (data preserved)
ALTER TABLE "clients" RENAME COLUMN "npwp_faskes" TO "npwp";
ALTER TABLE "clients" RENAME COLUMN "sistem_lama" TO "vendor_sebelumnya";
