-- ============================================
-- MIGRATION: Add Sales Summary Function
-- ============================================
-- This migration creates a function to calculate sales with and without payslip deductions
-- ============================================

-- ============================================
-- CREATE FUNCTION TO GET EMPLOYEE SALES SUMMARY
-- ============================================
CREATE OR REPLACE FUNCTION get_employee_sales_summary(p_employee_id UUID)
RETURNS TABLE(
  total_commissions DECIMAL(10, 2),
  total_sales_deductions DECIMAL(10, 2),
  net_sales DECIMAL(10, 2),
  total_commission_transactions INTEGER
) AS $$
DECLARE
  v_total_commissions DECIMAL(10, 2) := 0.00;
  v_total_deductions DECIMAL(10, 2) := 0.00;
  v_net_sales DECIMAL(10, 2) := 0.00;
  v_transaction_count INTEGER := 0;
BEGIN
  -- Calculate total commissions (all commission transactions for this employee)
  SELECT 
    COALESCE(SUM(ct.amount), 0.00),
    COUNT(ct.id)
  INTO v_total_commissions, v_transaction_count
  FROM public.commission_transaction ct
  WHERE ct.employee_id = p_employee_id
    AND ct.transaction_type = 'ADD'
    AND ct.status = 'APPLIED';

  -- Calculate total sales deductions from payslip releases
  SELECT COALESCE(SUM(pr.sales_deduction), 0.00)
  INTO v_total_deductions
  FROM public.payslip_release pr
  WHERE pr.employee_id = p_employee_id;

  -- Calculate net sales (commissions - deductions)
  v_net_sales := GREATEST(0.00, v_total_commissions - v_total_deductions);

  RETURN QUERY SELECT 
    v_total_commissions,
    v_total_deductions,
    v_net_sales,
    v_transaction_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================
-- To test the function, run:
-- SELECT * FROM get_employee_sales_summary('employee-uuid-here');

