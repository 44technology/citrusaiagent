-- ============================================================
-- Migration: Reefer Tracking + Journey Events
-- Run on your PostgreSQL database (Render or Hetzner)
-- Date: 2026-05-15
-- ============================================================

-- 1. Add new columns to Shipment table (reefer + ports + cargo)
ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "portOfLoading"     TEXT,
  ADD COLUMN IF NOT EXISTS "portOfDischarge"   TEXT,
  ADD COLUMN IF NOT EXISTS "transshipmentPort" TEXT,
  ADD COLUMN IF NOT EXISTS "containerType"     TEXT,
  ADD COLUMN IF NOT EXISTS "sealNumber"        TEXT,
  ADD COLUMN IF NOT EXISTS "cargoDescription"  TEXT,
  ADD COLUMN IF NOT EXISTS "grossWeight"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "numberOfBoxes"     INTEGER,
  ADD COLUMN IF NOT EXISTS "reeferTempSet"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "reeferTempActual"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "humidity"          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "ventilation"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "co2Level"          DOUBLE PRECISION;

-- 2. Create ShipmentEvent table
CREATE TABLE IF NOT EXISTS "ShipmentEvent" (
    "id"          TEXT NOT NULL,
    "shipmentId"  TEXT NOT NULL,
    "eventType"   TEXT NOT NULL,
    "location"    TEXT NOT NULL,
    "description" TEXT,
    "eventDate"   TIMESTAMP(3) NOT NULL,
    "tempReading" DOUBLE PRECISION,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShipmentEvent_shipmentId_fkey"
        FOREIGN KEY ("shipmentId")
        REFERENCES "Shipment"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Index for fast lookup by shipment
CREATE INDEX IF NOT EXISTS "ShipmentEvent_shipmentId_idx"
    ON "ShipmentEvent"("shipmentId");

-- Confirm
SELECT 'Migration complete: ShipmentEvent table and reefer columns added.' AS result;
