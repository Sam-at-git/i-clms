-- Migration: Add Contract Vectorization Fields
-- Created: 2026-01-24
-- Description: Add markdown text and vectorization status fields to Contract table

-- Add markdownText column
ALTER TABLE "Contract" ADD COLUMN "markdownText" TEXT;

-- Add isVectorized column
ALTER TABLE "Contract" ADD COLUMN "isVectorized" BOOLEAN NOT NULL DEFAULT false;

-- Add vectorizedAt column
ALTER TABLE "Contract" ADD COLUMN "vectorizedAt" TIMESTAMP(3);

-- Add vectorizationMethod column
ALTER TABLE "Contract" ADD COLUMN "vectorizationMethod" TEXT;

-- Add chunkCount column
ALTER TABLE "Contract" ADD COLUMN "chunkCount" INTEGER NOT NULL DEFAULT 0;
