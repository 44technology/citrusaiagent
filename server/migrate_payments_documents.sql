-- Migration: Add Payment and Document tables
-- Run this on your Render PostgreSQL database
-- Date: 2026-05-14

-- 1. Add 'notes' column to Invoice (if not exists)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 2. Create Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id"          TEXT NOT NULL,
    "invoiceId"   TEXT NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "method"      TEXT NOT NULL DEFAULT 'Bank Transfer',
    "reference"   TEXT,
    "notes"       TEXT,
    "paidAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId")
        REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Create Document table
CREATE TABLE IF NOT EXISTS "Document" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType"     TEXT NOT NULL,
    "size"         INTEGER NOT NULL,
    "path"         TEXT NOT NULL,
    "category"     TEXT NOT NULL DEFAULT 'General',
    "contactId"    TEXT,
    "orderId"      TEXT,
    "shipmentId"   TEXT,
    "invoiceId"    TEXT,
    "uploadedBy"   TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Document_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId")
        REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId")
        REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_invoiceId_fkey" FOREIGN KEY ("invoiceId")
        REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 4. Update Invoice status check to include 'Partial'
-- (No constraint change needed — status is a free TEXT field)

-- Confirm
SELECT 'Migration complete: Payment and Document tables created.' AS result;
