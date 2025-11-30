-- ============================================
-- MIGRATION: Create Employee Table
-- ============================================
-- This migration creates the employee_table to store employee information
-- connected to Supabase auth users
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE EMPLOYEE_ROLE ENUM (if not exists)
-- ============================================
DO $$
BEGIN
  -- Check if enum type exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'employee_role'
  ) THEN
    CREATE TYPE employee_role AS ENUM (
      'owner',
      'cashier',
      'worker',
      'masseuse'
    );
    RAISE NOTICE 'Created employee_role enum type';
  ELSE
    RAISE NOTICE 'employee_role enum type already exists';
  END IF;
END $$;

-- ============================================
-- 2. CREATE EMPLOYEE_TABLE
-- ============================================
DO $$
BEGIN
  -- Check if table already exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'employee'
  ) THEN
    -- Create the employee table
    CREATE TABLE public.employee (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      last_payslip_release TIMESTAMPTZ,
      role employee_role[] NOT NULL DEFAULT ARRAY['worker']::employee_role[],
      commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Constraints
      CONSTRAINT salary_positive CHECK (salary >= 0)
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_employee_user_id ON public.employee(user_id);
    CREATE INDEX idx_employee_role ON public.employee(role);
    CREATE INDEX idx_employee_created_at ON public.employee(created_at);

    -- Enable Row Level Security
    ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    -- Policy: Users can view their own employee record
    CREATE POLICY "Users can view own employee record"
      ON public.employee
      FOR SELECT
      USING (auth.uid() = user_id);

    -- Policy: Service role (admin) can do everything
    CREATE POLICY "Service role can manage all employee records"
      ON public.employee
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');

    RAISE NOTICE 'Created employee table with RLS policies';
  ELSE
    RAISE NOTICE 'Employee table already exists';
  END IF;
END $$;

-- ============================================
-- 3. CREATE OR REPLACE FUNCTION TO UPDATE UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_employee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO-UPDATE UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_employee_updated_at ON public.employee;

CREATE TRIGGER trigger_update_employee_updated_at
  BEFORE UPDATE ON public.employee
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_updated_at();

-- ============================================
-- 5. ADD COLUMNS IF TABLE EXISTS BUT COLUMNS ARE MISSING
-- ============================================
DO $$
BEGIN
  -- Add salary column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'salary'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN salary DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.employee
    ADD CONSTRAINT salary_positive CHECK (salary >= 0);
  END IF;

  -- Add last_payslip_release column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'last_payslip_release'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN last_payslip_release TIMESTAMPTZ;
  END IF;

  -- Add role column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN role employee_role[] NOT NULL DEFAULT ARRAY['worker']::employee_role[];
  END IF;

  -- Add commission_rate column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.employee
    ADD CONSTRAINT commission_rate_valid CHECK (commission_rate >= 0 AND commission_rate <= 100);
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the migration:
--
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'employee'
-- ORDER BY ordinal_position;
--
-- SELECT * FROM pg_enum WHERE enumtypid = 'employee_role'::regtype;
--
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE tablename = 'employee';
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'employee';
-- ============================================

