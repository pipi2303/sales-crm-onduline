-- Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): columns
-- ClientForm.tsx always collected but were never persisted anywhere
-- (sektor_client, alamat_pengiriman + same-as-billing toggle, website),
-- plus a real (server-tracked) discount approval trail replacing the old
-- setTimeout-based fake auto-approval in ClientForm.tsx's handleRequestApproval.

ALTER TABLE "clients"
  ADD COLUMN "sektor_client" TEXT,
  ADD COLUMN "alamat_pengiriman" TEXT,
  ADD COLUMN "alamat_sama_dengan_penagihan" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "discount" DECIMAL(5,2),
  ADD COLUMN "discount_status" TEXT,
  ADD COLUMN "discount_approval_status" TEXT,
  ADD COLUMN "discount_approval_requested_at" TIMESTAMP(3),
  ADD COLUMN "discount_approval_decided_by_id" TEXT,
  ADD COLUMN "discount_approval_decided_at" TIMESTAMP(3);
