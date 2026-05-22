-- Migration: Add ContactPerson table (people within a company/customer)
CREATE TABLE IF NOT EXISTS "ContactPerson" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contactId" TEXT NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
  "name"      TEXT NOT NULL,
  "title"     TEXT,
  "email"     TEXT,
  "phone"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ContactPerson_contactId_idx" ON "ContactPerson"("contactId");
