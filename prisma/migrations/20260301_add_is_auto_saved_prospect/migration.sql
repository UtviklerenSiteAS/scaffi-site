-- Migration: add isAutoSaved boolean to prospects
ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "isAutoSaved" boolean DEFAULT false;

-- Backfill: set isAutoSaved = false for existing rows (safe noop)
UPDATE "prospects" SET "isAutoSaved" = false WHERE "isAutoSaved" IS NULL;