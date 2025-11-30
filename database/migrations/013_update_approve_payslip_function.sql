-- ============================================
-- MIGRATION: Update Approve Payslip Function
-- ============================================
-- This migration updates the approve_payslip_request function
-- to reset employee salary to 0 and disable payslip requests after approval
-- ============================================

-- ============================================
-- UPDATE approve_payslip_request FUNCTION
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
-- VERIFICATION
-- ============================================
-- To verify the function was updated correctly, run:
--
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE proname = 'approve_payslip_request';
--
-- You should see the function includes:
-- SET salary = 0.00,
-- SET can_request_payslip = false,

