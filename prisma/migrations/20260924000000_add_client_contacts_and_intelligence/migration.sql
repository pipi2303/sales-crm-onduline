-- Bab 16.5 -- Organisation Tree / Influence Mapping & Customer
-- Intelligence MVP (24 Sep 2026). Lihat catatan desain di
-- prisma/schema.prisma (dekat model ClientContact / ClientIntelligence)
-- untuk alasan lengkapnya.

-- CreateEnum
CREATE TYPE "InfluenceRole" AS ENUM ('decision-maker', 'approver', 'influencer', 'technical-advisor', 'consultant');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('positive', 'neutral', 'negative');

-- CreateEnum
CREATE TYPE "RelationshipCloseness" AS ENUM ('baru-kenal', 'kenal-baik', 'champion');

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT,
    "email" TEXT,
    "telepon" TEXT,
    "whatsapp" TEXT,
    "influence_role" "InfluenceRole" NOT NULL,
    "relationship_status" "RelationshipStatus" NOT NULL DEFAULT 'neutral',
    "closeness" "RelationshipCloseness" NOT NULL DEFAULT 'baru-kenal',
    "reports_to_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_intelligence" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "profil_bisnis" TEXT,
    "proyek_berjalan" TEXT,
    "kompetitor_eksisting" TEXT,
    "sumber_informasi" TEXT,
    "catatan_tambahan" TEXT,
    "links" JSONB,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_intelligence_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "opportunity_activities" ADD COLUMN     "contact_id" TEXT;

-- CreateIndex
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts"("client_id");

-- CreateIndex
CREATE INDEX "client_contacts_reports_to_id_idx" ON "client_contacts"("reports_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_intelligence_client_id_key" ON "client_intelligence"("client_id");

-- CreateIndex
CREATE INDEX "opportunity_activities_contact_id_idx" ON "opportunity_activities"("contact_id");

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_intelligence" ADD CONSTRAINT "client_intelligence_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_intelligence" ADD CONSTRAINT "client_intelligence_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "client_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
