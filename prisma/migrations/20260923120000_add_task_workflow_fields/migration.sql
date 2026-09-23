-- Fase B follow-up (23 Sep 2026): the Task model in schema.prisma already
-- declared status/priority/type/category/dueDate/completedDate/assignedTo/
-- createdBy/checkInAccuracy/locationValidated/extra (added for the Bab 8
-- check-in feature and reused by Fase B's visit-compliance KPI), but NO
-- migration was ever generated for them -- the "tasks" table in production
-- only ever had the columns from 20260920010056_init (id, title,
-- description, opportunity_id, store_id, owner_id, check_in_lat,
-- check_in_lng, check_in_at, check_in_photo_url, created_at, updated_at).
--
-- This schema drift is why GET /api/tasks returned HTTP 500 in production
-- (Prisma's generated SELECT referenced columns that don't exist) and why
-- seedVisitTasks() (Fase B) created 0 rows despite correct seed data and
-- correct code -- every prisma.task.create()/findFirst() call failed at
-- the database level before any row could be written.

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in-progress', 'completed');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('visit', 'call', 'email', 'other');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'todo',
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'other',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "completed_date" TIMESTAMP(3),
ADD COLUMN     "assigned_to" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "check_in_accuracy" DOUBLE PRECISION,
ADD COLUMN     "location_validated" BOOLEAN,
ADD COLUMN     "extra" JSONB;

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_owner_id_idx" ON "tasks"("owner_id");
