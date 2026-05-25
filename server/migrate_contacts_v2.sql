-- Contact: add company detail fields + classifications/commodities
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "city"            TEXT,
  ADD COLUMN IF NOT EXISTS "state"           TEXT,
  ADD COLUMN IF NOT EXISTS "zip"             TEXT,
  ADD COLUMN IF NOT EXISTS "country"         TEXT,
  ADD COLUMN IF NOT EXISTS "address"         TEXT,
  ADD COLUMN IF NOT EXISTS "companyPhone"    TEXT,
  ADD COLUMN IF NOT EXISTS "website"         TEXT,
  ADD COLUMN IF NOT EXISTS "classifications" JSONB,
  ADD COLUMN IF NOT EXISTS "commodities"     JSONB;

-- ContactPerson: add firstName, lastName, linkedinUrl
ALTER TABLE "ContactPerson"
  ADD COLUMN IF NOT EXISTS "firstName"   TEXT,
  ADD COLUMN IF NOT EXISTS "lastName"    TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE "Contact" TO citrus;
GRANT ALL PRIVILEGES ON TABLE "ContactPerson" TO citrus;
