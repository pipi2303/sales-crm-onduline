-- Bab 16.5 lanjutan (24 Sep 2026) -- Komunikasi/interaksi client jadi
-- data sungguhan (sebelumnya cuma useState lokal di frontend). Lihat
-- catatan desain lengkap di prisma/schema.prisma dekat model
-- ClientCommunication untuk alasan kenapa ini model terpisah dari
-- OpportunityActivity.

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('Telepon', 'Email', 'Meeting', 'WhatsApp', 'Visit');

-- CreateTable
CREATE TABLE "client_communications" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categories" JSONB,
    "contact_id" TEXT,
    "created_by_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_communications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_communications_client_id_idx" ON "client_communications"("client_id");
-- CreateIndex
CREATE INDEX "client_communications_contact_id_idx" ON "client_communications"("contact_id");

-- AddForeignKey
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
