-- AlterTable: Territory gains assignedTo/coverage/updatedAt so a territory's
-- own profile fields (previously localStorage-only) live in the database.
-- leads/opportunities counts are deliberately NOT stored here -- they are
-- computed at read time from Lead.territory_id / Opportunity.territory_id
-- (see handleTerritories' GET in api/handler.ts), same "derive, don't
-- duplicate" approach as PerformanceTarget.achievementRate.
ALTER TABLE "territories" ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Lead/Opportunity gain an optional link to Territory. Neither
-- table had any territory/region link before this -- required for
-- "leads/opportunities dihitung otomatis" to be possible at all.
ALTER TABLE "leads" ADD COLUMN     "territory_id" TEXT;

ALTER TABLE "opportunities" ADD COLUMN     "territory_id" TEXT;

-- CreateIndex
CREATE INDEX "leads_territory_id_idx" ON "leads"("territory_id");

-- CreateIndex
CREATE INDEX "opportunities_territory_id_idx" ON "opportunities"("territory_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
