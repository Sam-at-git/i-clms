-- Migration: Add Department isActive field
-- Created: 2026-01-24
-- Description: Add isActive field to Department table for soft delete support

-- Add isActive column to Department
ALTER TABLE "Department" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Create index for isActive
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");
