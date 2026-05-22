-- Migration: Add Settings table for email config + signature
CREATE TABLE IF NOT EXISTS "Setting" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
