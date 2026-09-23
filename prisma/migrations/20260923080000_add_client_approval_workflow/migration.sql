-- AlterTable: Client gains the same approval-workflow shape Distributor/
-- Store already have (Bab 9) -- status/submittedBy/submittedAt/decidedBy/
-- decidedAt/rejectionNote. Default APPROVED (not PENDING) so every client
-- created before this migration keeps working exactly as before; only new
-- clients created after this ship as PENDING (set explicitly by
-- api/handler.ts's POST, not by this column default).
ALTER TABLE "clients" ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "submitted_by_id" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "decided_by_id" TEXT,
ADD COLUMN     "decided_at" TIMESTAMP(3),
ADD COLUMN     "rejection_note" TEXT;

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
