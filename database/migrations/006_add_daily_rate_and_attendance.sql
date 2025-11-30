-- ============================================
-- MIGRATION: Add Daily Rate and Attendance System
-- ============================================
-- This migration adds daily_rate column to employee table
-- and creates attendance tracking system for owners
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD DAILY_RATE COLUMN TO EMPLOYEE TABLE
-- ============================================
DO $$
BEGIN
  -- Add daily_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'daily_rate'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN daily_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    
    -- Add constraint to ensure daily_rate is non-negative
    ALTER TABLE public.employee
    ADD CONSTRAINT daily_rate_positive CHECK (daily_rate >= 0);
    
    -- Set default daily_rate based on role
    -- Workers get 350, others get 0
    -- Only update if daily_rate is still at default (0.00)
    -- Note: We'll update this in a separate statement after the DO block
    
    RAISE NOTICE 'Added daily_rate column to employee table';
  ELSE
    RAISE NOTICE 'daily_rate column already exists';
  END IF;
END $$;

-- Update existing employees' daily_rate based on role
-- Workers get 350, others get 0
-- Note: role is a single enum value, not an array
UPDATE public.employee
SET daily_rate = CASE 
  WHEN role = 'WORKER'::employee_role THEN 350.00
  ELSE 0.00
END
WHERE daily_rate = 0.00 OR daily_rate IS NULL;

-- ============================================
-- 2. CREATE ATTENDANCE TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance'
  ) THEN
    CREATE TABLE public.attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES public.employee(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      is_present BOOLEAN NOT NULL DEFAULT false,
      daily_rate_applied DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      marked_by UUID REFERENCES auth.users(id), -- Owner who marked attendance
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Ensure one attendance record per employee per day
      UNIQUE(employee_id, attendance_date),
      
      -- Ensure daily_rate_applied is non-negative
      CONSTRAINT daily_rate_applied_positive CHECK (daily_rate_applied >= 0)
    );

    -- Create indexes for performance
    CREATE INDEX idx_attendance_employee ON public.attendance(employee_id);
    CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
    CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, attendance_date);
    CREATE INDEX idx_attendance_is_present ON public.attendance(is_present);
    CREATE INDEX idx_attendance_marked_by ON public.attendance(marked_by);

    -- Enable Row Level Security
    ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    -- Policy: Owners can view all attendance records
    CREATE POLICY "Owners can view all attendance"
      ON public.attendance
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.employee
          WHERE employee.user_id = auth.uid()
          AND employee.role = 'OWNER'::employee_role
        )
      );

    -- Policy: Employees can view their own attendance
    CREATE POLICY "Employees can view own attendance"
      ON public.attendance
      FOR SELECT
      USING (
        employee_id IN (
          SELECT id FROM public.employee
          WHERE user_id = auth.uid()
        )
      );

    -- Policy: Only owners can insert/update attendance
    CREATE POLICY "Only owners can manage attendance"
      ON public.attendance
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.employee
          WHERE employee.user_id = auth.uid()
          AND employee.role = 'OWNER'::employee_role
        )
      );

    -- Policy: Service role can do everything
    CREATE POLICY "Service role can manage all attendance"
      ON public.attendance
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role');

    RAISE NOTICE 'Created attendance table with RLS policies';
  ELSE
    RAISE NOTICE 'attendance table already exists';
  END IF;
END $$;

-- ============================================
-- 3. CREATE OR REPLACE FUNCTION TO UPDATE UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO-UPDATE UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_attendance_updated_at ON public.attendance;

CREATE TRIGGER trigger_update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

-- ============================================
-- 5. CREATE FUNCTION TO MARK ATTENDANCE AND UPDATE SALARY
-- ============================================
CREATE OR REPLACE FUNCTION mark_attendance_and_update_salary(
  p_employee_id UUID,
  p_attendance_date DATE,
  p_is_present BOOLEAN,
  p_marked_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_employee RECORD;
  v_daily_rate DECIMAL(10, 2);
  v_existing_attendance RECORD;
  v_previous_present BOOLEAN;
  v_previous_daily_rate DECIMAL(10, 2);
  v_salary_adjustment DECIMAL(10, 2);
  v_new_attendance_id UUID;
BEGIN
  -- Get employee info
  SELECT id, daily_rate, salary INTO v_employee
  FROM public.employee
  WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Employee not found'
    );
  END IF;

  -- Check if attendance already exists for this date
  SELECT id, is_present, daily_rate_applied INTO v_existing_attendance
  FROM public.attendance
  WHERE employee_id = p_employee_id
    AND attendance_date = p_attendance_date;
  
  v_previous_present := COALESCE(v_existing_attendance.is_present, false);
  v_previous_daily_rate := COALESCE(v_existing_attendance.daily_rate_applied, 0);
  
  -- Calculate salary adjustment
  IF p_is_present AND NOT v_previous_present THEN
    -- Marking as present: add daily_rate
    v_daily_rate := v_employee.daily_rate;
    v_salary_adjustment := v_daily_rate;
  ELSIF NOT p_is_present AND v_previous_present THEN
    -- Changing from present to absent: remove the daily_rate that was added
    v_salary_adjustment := -v_previous_daily_rate;
    v_daily_rate := 0;
  ELSIF p_is_present AND v_previous_present THEN
    -- Already present, just update if daily_rate changed
    v_daily_rate := v_employee.daily_rate;
    IF v_daily_rate != v_previous_daily_rate THEN
      v_salary_adjustment := v_daily_rate - v_previous_daily_rate;
    ELSE
      v_salary_adjustment := 0;
    END IF;
  ELSE
    -- Already absent
    v_daily_rate := 0;
    v_salary_adjustment := 0;
  END IF;

  -- Insert or update attendance record
  INSERT INTO public.attendance (
    employee_id,
    attendance_date,
    is_present,
    daily_rate_applied,
    marked_by
  ) VALUES (
    p_employee_id,
    p_attendance_date,
    p_is_present,
    CASE WHEN p_is_present THEN v_daily_rate ELSE 0 END,
    p_marked_by
  )
  ON CONFLICT (employee_id, attendance_date)
  DO UPDATE SET
    is_present = p_is_present,
    daily_rate_applied = CASE WHEN p_is_present THEN v_daily_rate ELSE 0 END,
    marked_by = p_marked_by,
    updated_at = NOW()
  RETURNING id INTO v_new_attendance_id;

  -- Update employee salary if there's an adjustment
  IF v_salary_adjustment != 0 THEN
    UPDATE public.employee
    SET salary = salary + v_salary_adjustment
    WHERE id = p_employee_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'attendance_id', v_new_attendance_id,
    'salary_adjustment', v_salary_adjustment,
    'new_salary', (SELECT salary FROM public.employee WHERE id = p_employee_id)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE FUNCTION TO GET EMPLOYEES WITH USER EMAILS (OPTIONAL)
-- ============================================
-- This function helps fetch employee info with user emails
-- Note: Requires proper RLS policies on auth.users access
CREATE OR REPLACE FUNCTION get_employees_with_user_info()
RETURNS TABLE (
  employee_id UUID,
  user_id UUID,
  salary DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  role employee_role,
  created_at TIMESTAMPTZ,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.user_id,
    e.salary,
    e.daily_rate,
    e.role,
    e.created_at,
    COALESCE(au.email, 'Unknown')::TEXT as user_email
  FROM public.employee e
  LEFT JOIN auth.users au ON au.id = e.user_id
  ORDER BY e.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the migration:
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'employee' AND column_name = 'daily_rate';
--
-- SELECT * FROM information_schema.tables 
-- WHERE table_name = 'attendance';
--
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE tablename = 'attendance';
--
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'attendance';
-- ============================================

