-- ─── Multi-company migration ──────────────────────────────────────────────────
-- Run once on the server: psql $DATABASE_URL < migrate_companies.sql

-- 1. Company table
CREATE TABLE IF NOT EXISTS "Company" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "color"     TEXT NOT NULL DEFAULT '#ff6b00',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Company_name_key" ON "Company"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");

-- 2. Seed two companies (fixed IDs so we can reference them below)
INSERT INTO "Company" ("id","name","slug","color") VALUES
  ('cmp-wft-0001',        'WFT',         'wft',         '#3b82f6'),
  ('cmp-sweetfresh-0001', 'Sweet Fresh', 'sweet-fresh', '#ff6b00')
ON CONFLICT DO NOTHING;

-- 3. Add companyId column to main tables (nullable so existing rows aren't broken)
ALTER TABLE "Contact"       ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;
ALTER TABLE "Order"         ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;
ALTER TABLE "Shipment"      ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;
ALTER TABLE "Document"      ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;
ALTER TABLE "Invoice"       ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;

-- 4. Assign ALL existing data to Sweet Fresh (the original company)
UPDATE "Contact"       SET "companyId" = 'cmp-sweetfresh-0001' WHERE "companyId" IS NULL;
UPDATE "Order"         SET "companyId" = 'cmp-sweetfresh-0001' WHERE "companyId" IS NULL;
UPDATE "Shipment"      SET "companyId" = 'cmp-sweetfresh-0001' WHERE "companyId" IS NULL;
UPDATE "Document"      SET "companyId" = 'cmp-sweetfresh-0001' WHERE "companyId" IS NULL;
UPDATE "Invoice"       SET "companyId" = 'cmp-sweetfresh-0001' WHERE "companyId" IS NULL;
UPDATE "PurchaseOrder" SET "companyId" = 'cmp-sweetfresh-0001' WHERE "companyId" IS NULL;

-- 5. Advance payment status column
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "advancePaymentStatus" TEXT;

-- Done
SELECT 'Migration complete: ' || COUNT(*) || ' companies' AS result FROM "Company";
