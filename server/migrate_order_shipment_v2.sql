-- ============================================================
-- Migration: Order v2 + ShipmentExpense
-- Run on your PostgreSQL database
-- Date: 2026-05-20
-- ============================================================

-- 1. Update Order table
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "grower"        TEXT,
  ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "salePrice"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "expense"       DOUBLE PRECISION;

-- Make referenceId unique (if not already)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_referenceId_key'
  ) THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_referenceId_key" UNIQUE ("referenceId");
  END IF;
END $$;

-- Make previously required fields optional
ALTER TABLE "Order"
  ALTER COLUMN "shipper"     DROP NOT NULL,
  ALTER COLUMN "label"       DROP NOT NULL,
  ALTER COLUMN "boxType"     DROP NOT NULL,
  ALTER COLUMN "receiver"    DROP NOT NULL,
  ALTER COLUMN "week"        DROP NOT NULL;

-- 2. Add orderId to Shipment
ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "orderId" TEXT;

ALTER TABLE "Shipment"
  ADD CONSTRAINT IF NOT EXISTS "Shipment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Create ShipmentExpense table
CREATE TABLE IF NOT EXISTS "ShipmentExpense" (
  "id"            TEXT NOT NULL,
  "shipmentId"    TEXT NOT NULL,
  "type"          TEXT NOT NULL,
  "description"   TEXT,
  "amount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "boxQuantity"   INTEGER,
  "boxPrice"      DOUBLE PRECISION,
  "tariffPercent" DOUBLE PRECISION DEFAULT 10,
  "invoiceNumber" TEXT,
  "isRevenue"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShipmentExpense_shipmentId_fkey"
    FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShipmentExpense_shipmentId_idx" ON "ShipmentExpense"("shipmentId");

SELECT 'Migration complete: Order v2 + ShipmentExpense' AS result;
