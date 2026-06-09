-- Migration v3: Add pallets, packType, variety, grower to Shipment
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "pallets"   INTEGER;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "packType"  TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "variety"   TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "grower"    TEXT;
