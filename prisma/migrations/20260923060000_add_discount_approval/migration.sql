-- CreateEnum
CREATE TYPE "DiscountApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'counter-offer');

-- CreateEnum
CREATE TYPE "DiscountStepAction" AS ENUM ('pending', 'approved', 'rejected', 'counter-offer');

-- CreateTable
CREATE TABLE "discount_approval_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "opportunity_id" TEXT,
    "product_name" TEXT NOT NULL,
    "original_price" DECIMAL(14,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL,
    "final_price" DECIMAL(14,2) NOT NULL,
    "requested_by_id" TEXT,
    "requested_by_name" TEXT NOT NULL,
    "requested_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "status" "DiscountApprovalStatus" NOT NULL DEFAULT 'pending',
    "current_approver" TEXT,
    "approval_level" INTEGER NOT NULL DEFAULT 1,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "valid_until" TIMESTAMP(3),
    "original_margin" DECIMAL(5,2) NOT NULL,
    "proposed_margin" DECIMAL(5,2) NOT NULL,
    "region" TEXT,
    "conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_approval_steps" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approver_name" TEXT NOT NULL,
    "approver_role" TEXT NOT NULL,
    "action" "DiscountStepAction" NOT NULL DEFAULT 'pending',
    "decided_at" TIMESTAMP(3),
    "comment" TEXT,
    "counter_offer_percent" DECIMAL(5,2),
    "conditions_added" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_approval_requests_request_number_key" ON "discount_approval_requests"("request_number");

-- CreateIndex
CREATE INDEX "discount_approval_steps_request_id_idx" ON "discount_approval_steps"("request_id");

-- AddForeignKey
ALTER TABLE "discount_approval_steps" ADD CONSTRAINT "discount_approval_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "discount_approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
