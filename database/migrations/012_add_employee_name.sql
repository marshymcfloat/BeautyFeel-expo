-- ============================================
-- MIGRATION: Add Name Column to Employee Table
-- ============================================
-- This migration adds a name column to the employee table
-- so we can identify employees by name
-- ============================================

-- ============================================
-- ADD name COLUMN TO EMPLOYEE TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN name TEXT;
    
    RAISE NOTICE 'Added name column to employee table';
  ELSE
    RAISE NOTICE 'name column already exists in employee table';
  END IF;
END $$;

-- ============================================
-- UPDATE EXISTING RECORDS (OPTIONAL)
-- ============================================
-- If you want to set default names for existing employees,
-- you can uncomment and modify this section:
--
-- UPDATE public.employee
-- SET name = 'Employee ' || SUBSTRING(id::TEXT, 1, 8)
-- WHERE name IS NULL;

