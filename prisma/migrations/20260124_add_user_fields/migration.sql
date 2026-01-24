-- Migration: Add User management fields
-- Created: 2026-01-24
-- Description: Add isActive, mustChangePassword, lastPasswordChangedAt, and createdById fields to User table

-- Add user management fields
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "lastPasswordChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "createdById" TEXT;

-- Create foreign key for user creator
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
