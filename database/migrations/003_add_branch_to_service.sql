-- ============================================
-- MIGRATION: Add Branch Column to Service Table
-- ============================================
-- This migration adds a branch column to the service table
-- to associate services with specific branches (NAILS, SKIN, LASHES, MASSAGE)
-- Default value is 'NAILS' for existing services
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD BRANCH COLUMN TO SERVICE TABLE
-- ============================================
DO $$
BEGIN
  -- Check if branch column already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service'
      AND column_name = 'branch'
  ) THEN
    -- Add branch column with default value
    ALTER TABLE public.service
    ADD COLUMN branch public.branch DEFAULT 'NAILS' NOT NULL;
    
    RAISE NOTICE 'Added branch column to service table with default value NAILS';
  ELSE
    RAISE NOTICE 'Branch column already exists in service table';
  END IF;
END $$;

-- ============================================
-- 2. UPDATE EXISTING SERVICES TO DEFAULT BRANCH
-- ============================================
-- Set any NULL or missing branch values to 'NAILS'
UPDATE public.service
SET branch = 'NAILS'
WHERE branch IS NULL;

-- ============================================
-- 3. CREATE INDEX FOR PERFORMANCE
-- ============================================
-- Index on branch for faster filtering
CREATE INDEX IF NOT EXISTS idx_service_branch 
ON public.service(branch);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the migration:
-- 
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'service' AND column_name = 'branch';
--
-- SELECT branch, COUNT(*) as service_count
-- FROM public.service
-- GROUP BY branch;
-- ============================================

