-- ============================================
-- MIGRATION: Create Payslip Request System
-- ============================================
-- This migration creates tables and functions for managing payslip requests
-- Employees can request payslips, owners can approve/reject them
-- Only unpaid attendances and commissions are included
-- ============================================

-- ============================================
-- 1. CREATE PAYSLIP REQUEST STATUS ENUM
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'payslip_request_status'
  ) THEN
    CREATE TYPE payslip_request_status AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED'
    );
    RAISE NOTICE 'Created payslip_request_status enum type';
  ELSE
    RAISE NOTICE 'payslip_request_status enum type already exists';
  END IF;
END $$;

-- ============================================
-- 2. ADD can_request_payslip COLUMN TO EMPLOYEE TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee'
      AND column_name = 'can_request_payslip'
  ) THEN
    ALTER TABLE public.employee
    ADD COLUMN can_request_payslip BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'Added can_request_payslip column to employee table';
  ELSE
    RAISE NOTICE 'can_request_payslip column already exists';
  END IF;
END $$;

-- ============================================
-- 3. CREATE PAYSLIP_REQUEST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payslip_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee(id) ON DELETE CASCADE,
  requested_amount DECIMAL(10, 2) NOT NULL CHECK (requested_amount >= 0),
  calculated_attendance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  calculated_commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status payslip_request_status NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_status_transition CHECK (
    (status = 'PENDING' AND reviewed_at IS NULL) OR
    (status IN ('APPROVED', 'REJECTED') AND reviewed_at IS NOT NULL)
  )
);

-- ============================================
-- 4. CREATE PAYSLIP_RELEASE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payslip_release (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_request_id UUID NOT NULL UNIQUE REFERENCES public.payslip_request(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employee(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  attendance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  period_start_date DATE,
  period_end_date DATE,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. CREATE PAYSLIP_ATTENDANCE TABLE (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payslip_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_release_id UUID NOT NULL REFERENCES public.payslip_release(id) ON DELETE CASCADE,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(payslip_release_id, attendance_id)
);

-- ============================================
-- 6. CREATE PAYSLIP_COMMISSION TABLE (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payslip_commission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_release_id UUID NOT NULL REFERENCES public.payslip_release(id) ON DELETE CASCADE,
  commission_transaction_id UUID NOT NULL REFERENCES public.commission_transaction(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(payslip_release_id, commission_transaction_id)
);

-- ============================================
-- 7. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payslip_request_employee_id ON public.payslip_request(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_request_status ON public.payslip_request(status);
CREATE INDEX IF NOT EXISTS idx_payslip_request_requested_at ON public.payslip_request(requested_at);
CREATE INDEX IF NOT EXISTS idx_payslip_release_employee_id ON public.payslip_release(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_release_released_at ON public.payslip_release(released_at);
CREATE INDEX IF NOT EXISTS idx_payslip_attendance_payslip_id ON public.payslip_attendance(payslip_release_id);
CREATE INDEX IF NOT EXISTS idx_payslip_commission_payslip_id ON public.payslip_commission(payslip_release_id);

-- ============================================
-- 8. CREATE TRIGGER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_payslip_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payslip_release_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payslip_request_updated_at ON public.payslip_request;
CREATE TRIGGER trigger_update_payslip_request_updated_at
  BEFORE UPDATE ON public.payslip_request
  FOR EACH ROW
  EXECUTE FUNCTION update_payslip_request_updated_at();

DROP TRIGGER IF EXISTS trigger_update_payslip_release_updated_at ON public.payslip_release;
CREATE TRIGGER trigger_update_payslip_release_updated_at
  BEFORE UPDATE ON public.payslip_release
  FOR EACH ROW
  EXECUTE FUNCTION update_payslip_release_updated_at();

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.payslip_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_release ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_commission ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. CREATE RLS POLICIES
-- ============================================

-- Payslip Request Policies
-- Employees can view their own requests
CREATE POLICY "Employees can view own payslip requests"
  ON public.payslip_request
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.id = payslip_request.employee_id
      AND e.user_id = auth.uid()
    )
  );

-- Employees can create their own requests if allowed
CREATE POLICY "Employees can create own payslip requests"
  ON public.payslip_request
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.id = payslip_request.employee_id
      AND e.user_id = auth.uid()
      AND e.can_request_payslip = true
      AND e.role != 'OWNER'::employee_role
    )
  );

-- Owners can view all requests
CREATE POLICY "Owners can view all payslip requests"
  ON public.payslip_request
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Owners can update requests (approve/reject)
CREATE POLICY "Owners can update payslip requests"
  ON public.payslip_request
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Payslip Release Policies
-- Employees can view their own releases
CREATE POLICY "Employees can view own payslip releases"
  ON public.payslip_release
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.id = payslip_release.employee_id
      AND e.user_id = auth.uid()
    )
  );

-- Owners can view all releases
CREATE POLICY "Owners can view all payslip releases"
  ON public.payslip_release
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Only owners can create releases (via function)
CREATE POLICY "Owners can create payslip releases"
  ON public.payslip_release
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Junction table policies (read-only for employees, full access for owners)
CREATE POLICY "Employees can view own payslip attendances"
  ON public.payslip_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payslip_release pr
      JOIN public.employee e ON e.id = pr.employee_id
      WHERE pr.id = payslip_attendance.payslip_release_id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage payslip attendances"
  ON public.payslip_attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

CREATE POLICY "Employees can view own payslip commissions"
  ON public.payslip_commission
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payslip_release pr
      JOIN public.employee e ON e.id = pr.employee_id
      WHERE pr.id = payslip_commission.payslip_release_id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage payslip commissions"
  ON public.payslip_commission
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- ============================================
-- 11. CREATE FUNCTION TO CALCULATE UNPAID AMOUNT
-- ============================================
CREATE OR REPLACE FUNCTION calculate_unpaid_payslip_amount(p_employee_id UUID)
RETURNS TABLE(
  total_amount DECIMAL(10, 2),
  attendance_amount DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2)
) AS $$
DECLARE
  v_attendance_amount DECIMAL(10, 2) := 0.00;
  v_commission_amount DECIMAL(10, 2) := 0.00;
  v_total_amount DECIMAL(10, 2) := 0.00;
BEGIN
  -- Calculate unpaid attendance amount
  -- Include attendances that haven't been included in any payslip release
  SELECT COALESCE(SUM(a.daily_rate_applied), 0.00)
  INTO v_attendance_amount
  FROM public.attendance a
  WHERE a.employee_id = p_employee_id
    AND a.is_present = true
    AND a.daily_rate_applied > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.payslip_attendance pa
      WHERE pa.attendance_id = a.id
    );

  -- Calculate unpaid commission amount
  -- Include commissions that haven't been included in any payslip release
  SELECT COALESCE(SUM(ct.amount), 0.00)
  INTO v_commission_amount
  FROM public.commission_transaction ct
  WHERE ct.employee_id = p_employee_id
    AND ct.status = 'APPLIED'
    AND ct.transaction_type = 'ADD'
    AND NOT EXISTS (
      SELECT 1 FROM public.payslip_commission pc
      WHERE pc.commission_transaction_id = ct.id
    );

  v_total_amount := v_attendance_amount + v_commission_amount;

  RETURN QUERY SELECT v_total_amount, v_attendance_amount, v_commission_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. CREATE FUNCTION TO CREATE PAYSLIP REQUEST
-- ============================================
CREATE OR REPLACE FUNCTION create_payslip_request(p_employee_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  payslip_request_id UUID,
  requested_amount DECIMAL(10, 2),
  error_message TEXT
) AS $$
DECLARE
  v_employee_record RECORD;
  v_unpaid_amount RECORD;
  v_request_id UUID;
BEGIN
  -- Check if employee exists and can request payslip
  SELECT e.*
  INTO v_employee_record
  FROM public.employee e
  WHERE e.id = p_employee_id
    AND e.user_id = auth.uid()
    AND e.role != 'OWNER'::employee_role;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 0.00::DECIMAL, 'Employee not found or not authorized'::TEXT;
    RETURN;
  END IF;

  IF v_employee_record.can_request_payslip = false THEN
    RETURN QUERY SELECT false, NULL::UUID, 0.00::DECIMAL, 'Employee is not allowed to request payslips'::TEXT;
    RETURN;
  END IF;

  -- Check if there's a pending request
  IF EXISTS (
    SELECT 1 FROM public.payslip_request pr
    WHERE pr.employee_id = p_employee_id
    AND pr.status = 'PENDING'
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 0.00::DECIMAL, 'You already have a pending payslip request'::TEXT;
    RETURN;
  END IF;

  -- Calculate unpaid amount
  SELECT * INTO v_unpaid_amount
  FROM calculate_unpaid_payslip_amount(p_employee_id);

  IF v_unpaid_amount.total_amount <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 0.00::DECIMAL, 'No unpaid amount available for payslip'::TEXT;
    RETURN;
  END IF;

  -- Create payslip request
  INSERT INTO public.payslip_request (
    employee_id,
    requested_amount,
    calculated_attendance_amount,
    calculated_commission_amount,
    status
  ) VALUES (
    p_employee_id,
    v_unpaid_amount.total_amount,
    v_unpaid_amount.attendance_amount,
    v_unpaid_amount.commission_amount,
    'PENDING'
  )
  RETURNING id INTO v_request_id;

  RETURN QUERY SELECT true, v_request_id, v_unpaid_amount.total_amount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. CREATE FUNCTION TO APPROVE PAYSLIP REQUEST
-- ============================================
CREATE OR REPLACE FUNCTION approve_payslip_request(
  p_request_id UUID,
  p_reviewer_user_id UUID,
  p_period_start_date DATE DEFAULT NULL,
  p_period_end_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  payslip_release_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_request_record RECORD;
  v_employee_record RECORD;
  v_release_id UUID;
  v_attendance_record RECORD;
  v_commission_record RECORD;
BEGIN
  -- Verify reviewer is owner
  SELECT e.*
  INTO v_employee_record
  FROM public.employee e
  WHERE e.user_id = p_reviewer_user_id
    AND e.role = 'OWNER'::employee_role;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Only owners can approve payslip requests'::TEXT;
    RETURN;
  END IF;

  -- Get the request
  SELECT pr.*
  INTO v_request_record
  FROM public.payslip_request pr
  WHERE pr.id = p_request_id
    AND pr.status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Payslip request not found or not pending'::TEXT;
    RETURN;
  END IF;

  -- Create payslip release
  INSERT INTO public.payslip_release (
    payslip_request_id,
    employee_id,
    total_amount,
    attendance_amount,
    commission_amount,
    period_start_date,
    period_end_date,
    released_by,
    notes
  ) VALUES (
    v_request_record.id,
    v_request_record.employee_id,
    v_request_record.requested_amount,
    v_request_record.calculated_attendance_amount,
    v_request_record.calculated_commission_amount,
    COALESCE(p_period_start_date, CURRENT_DATE),
    COALESCE(p_period_end_date, CURRENT_DATE),
    p_reviewer_user_id,
    p_notes
  )
  RETURNING id INTO v_release_id;

  -- Link attendances to payslip release
  FOR v_attendance_record IN
    SELECT a.id, a.daily_rate_applied
    FROM public.attendance a
    WHERE a.employee_id = v_request_record.employee_id
      AND a.is_present = true
      AND a.daily_rate_applied > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.payslip_attendance pa
        WHERE pa.attendance_id = a.id
      )
  LOOP
    INSERT INTO public.payslip_attendance (
      payslip_release_id,
      attendance_id,
      amount
    ) VALUES (
      v_release_id,
      v_attendance_record.id,
      v_attendance_record.daily_rate_applied
    );
  END LOOP;

  -- Link commissions to payslip release
  FOR v_commission_record IN
    SELECT ct.id, ct.amount
    FROM public.commission_transaction ct
    WHERE ct.employee_id = v_request_record.employee_id
      AND ct.status = 'APPLIED'
      AND ct.transaction_type = 'ADD'
      AND NOT EXISTS (
        SELECT 1 FROM public.payslip_commission pc
        WHERE pc.commission_transaction_id = ct.id
      )
  LOOP
    INSERT INTO public.payslip_commission (
      payslip_release_id,
      commission_transaction_id,
      amount
    ) VALUES (
      v_release_id,
      v_commission_record.id,
      v_commission_record.amount
    );
  END LOOP;

  -- Update request status
  UPDATE public.payslip_request
  SET status = 'APPROVED',
      reviewed_at = NOW(),
      reviewed_by = p_reviewer_user_id,
      notes = COALESCE(p_notes, notes)
  WHERE id = p_request_id;

  -- Update employee: reset salary to 0, disable payslip requests, update last payslip release date
  UPDATE public.employee
  SET salary = 0.00,
      can_request_payslip = false,
      last_payslip_release = NOW(),
      updated_at = NOW()
  WHERE id = v_request_record.employee_id;

  RETURN QUERY SELECT true, v_release_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. CREATE FUNCTION TO REJECT PAYSLIP REQUEST
-- ============================================
CREATE OR REPLACE FUNCTION reject_payslip_request(
  p_request_id UUID,
  p_reviewer_user_id UUID,
  p_rejection_reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_employee_record RECORD;
  v_request_record RECORD;
BEGIN
  -- Verify reviewer is owner
  SELECT e.*
  INTO v_employee_record
  FROM public.employee e
  WHERE e.user_id = p_reviewer_user_id
    AND e.role = 'OWNER'::employee_role;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Only owners can reject payslip requests'::TEXT;
    RETURN;
  END IF;

  -- Get the request
  SELECT pr.*
  INTO v_request_record
  FROM public.payslip_request pr
  WHERE pr.id = p_request_id
    AND pr.status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Payslip request not found or not pending'::TEXT;
    RETURN;
  END IF;

  -- Update request status
  UPDATE public.payslip_request
  SET status = 'REJECTED',
      reviewed_at = NOW(),
      reviewed_by = p_reviewer_user_id,
      rejection_reason = p_rejection_reason
  WHERE id = p_request_id;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. CREATE FUNCTION TO TOGGLE EMPLOYEE PAYSLIP REQUEST PERMISSION
-- ============================================
CREATE OR REPLACE FUNCTION toggle_employee_payslip_permission(
  p_employee_id UUID,
  p_owner_user_id UUID,
  p_can_request BOOLEAN
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_owner_record RECORD;
BEGIN
  -- Verify caller is owner
  SELECT e.*
  INTO v_owner_record
  FROM public.employee e
  WHERE e.user_id = p_owner_user_id
    AND e.role = 'OWNER'::employee_role;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Only owners can modify payslip request permissions'::TEXT;
    RETURN;
  END IF;

  -- Update employee permission
  UPDATE public.employee
  SET can_request_payslip = p_can_request,
      updated_at = NOW()
  WHERE id = p_employee_id;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify:
--
-- SELECT * FROM public.payslip_request;
-- SELECT * FROM public.payslip_release;
-- SELECT * FROM public.payslip_attendance;
-- SELECT * FROM public.payslip_commission;
-- SELECT calculate_unpaid_payslip_amount('employee-uuid-here');

