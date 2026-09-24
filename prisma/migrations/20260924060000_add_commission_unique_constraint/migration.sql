-- Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): activates the
-- duplicate-payout protection api/handler.ts's handleCommissions has
-- always tried to report (it already catches Postgres error P2002 for this
-- exact column pair and returns a friendly 409), which never actually
-- fired because this constraint never existed.
CREATE UNIQUE INDEX "commission_records_sales_rep_id_period_key" ON "commission_records"("sales_rep_id", "period");
