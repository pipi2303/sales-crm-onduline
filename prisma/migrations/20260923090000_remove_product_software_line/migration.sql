-- Removes the software/physical Product supertype-subtype split. Onduline
-- is a physical building-materials distributor only; the software line
-- (ProductType, ProductSoftwareAttrs, BillingCycle, DeploymentType) was
-- inherited from an earlier healthcare-software assumption and never
-- applied to this business -- prisma/seed.ts never seeded a single
-- SOFTWARE-typed product. ProductPhysicalAttrs, ProductStatus and
-- everything else on Product are untouched.
--
-- DESTRUCTIVE: drops a NOT NULL column, a full table and 3 enum types
-- from live production data. Must be applied with
-- `npx prisma migrate deploy` followed by `npx prisma generate` -- this
-- sandbox cannot reach the Neon database or binaries.prisma.sh to run
-- either step itself. Before applying, confirm (e.g. via a read-only
-- query) that no live "products" row actually has product_type =
-- 'software' -- if one exists, back up product_software_attrs for that
-- row first, since this migration deletes it permanently.

-- DropIndex
DROP INDEX "products_product_type_idx";

-- DropForeignKey
ALTER TABLE "product_software_attrs" DROP CONSTRAINT "product_software_attrs_product_id_fkey";

-- DropTable
DROP TABLE "product_software_attrs";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "product_type";

-- DropEnum
DROP TYPE "ProductType";

-- DropEnum
DROP TYPE "BillingCycle";

-- DropEnum
DROP TYPE "DeploymentType";
