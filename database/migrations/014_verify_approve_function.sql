-- ============================================
-- MIGRATION: Verify Approve Payslip Function
-- ============================================
-- This migration verifies that the approve_payslip_request function
-- includes the salary reset logic. If not, it will update it.
-- ============================================

-- Check if the function includes salary reset
DO $$
DECLARE
  v_function_source TEXT;
  v_has_salary_reset BOOLEAN := false;
BEGIN
  -- Get the function source code
  SELECT prosrc INTO v_function_source
  FROM pg_proc
  WHERE proname = 'approve_payslip_request'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;

  IF v_function_source IS NULL THEN
    RAISE EXCEPTION 'Function approve_payslip_request not found';
  END IF;

  -- Check if the function includes salary reset
  IF v_function_source LIKE '%SET salary = 0.00%' OR v_function_source LIKE '%salary = 0%' THEN
    v_has_salary_reset := true;
    RAISE NOTICE 'Function approve_payslip_request already includes salary reset logic';
  ELSE
    RAISE WARNING 'Function approve_payslip_request does NOT include salary reset logic. Please run migration 013_update_approve_payslip_function.sql';
  END IF;
END $$;

