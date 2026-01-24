-- Migration: Add Tag management fields
-- Created: 2026-01-24
-- Description: Add isActive and isSystem fields to Tag table for soft delete and system tag support

-- Add tag management fields
ALTER TABLE "Tag" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tag" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX "Tag_category_idx" ON "Tag"("category");
CREATE INDEX "Tag_isActive_idx" ON "Tag"("isActive");
