-- ============================================
-- MIGRATION: Add Overall Sales Summary Function
-- ============================================
-- This migration creates a function to calculate overall sales with and without payslip deductions
-- For the owner's sales dashboard
-- ============================================

-- ============================================
-- CREATE FUNCTION TO GET OVERALL SALES SUMMARY
-- ============================================
CREATE OR REPLACE FUNCTION get_overall_sales_summary(
  p_time_span TEXT DEFAULT 'month'
)
RETURNS TABLE(
  total_sales DECIMAL(10, 2),
  total_sales_deductions DECIMAL(10, 2),
  net_sales DECIMAL(10, 2)
) AS $$
DECLARE
  v_total_sales DECIMAL(10, 2) := 0.00;
  v_total_deductions DECIMAL(10, 2) := 0.00;
  v_net_sales DECIMAL(10, 2) := 0.00;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Calculate start and end dates based on time span
  CASE p_time_span
    WHEN 'day' THEN
      v_start_date := DATE_TRUNC('day', NOW());
      v_end_date := DATE_TRUNC('day', NOW()) + INTERVAL '1 day' - INTERVAL '1 second';
    WHEN 'week' THEN
      v_start_date := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
      v_end_date := NOW();
    WHEN 'month' THEN
      v_start_date := DATE_TRUNC('day', NOW() - INTERVAL '1 month');
      v_end_date := NOW();
    ELSE
      v_start_date := '1970-01-01'::TIMESTAMPTZ;
      v_end_date := NOW();
  END CASE;

  -- Calculate total sales from bookings (completed/paid bookings)
  SELECT COALESCE(SUM(b."grandTotal" - COALESCE(b."grandDiscount", 0)), 0.00)
  INTO v_total_sales
  FROM public.booking b
  WHERE b.status IN ('COMPLETED', 'PAID')
    AND (p_time_span = 'all' OR (b.created_at >= v_start_date AND b.created_at <= v_end_date));

  -- Calculate total sales deductions from approved payslip releases
  -- Only count releases that are linked to APPROVED payslip requests
  -- Match deductions based on the payslip period (period_start_date/period_end_date)
  -- that overlaps with the selected time range, not when it was released
  -- Two periods overlap if: period1_start <= period2_end AND period1_end >= period2_start
  -- Use total_amount (the amount paid out to employees) as the deduction from sales
  SELECT COALESCE(SUM(pr.total_amount), 0.00)
  INTO v_total_deductions
  FROM public.payslip_release pr
  INNER JOIN public.payslip_request prq ON pr.payslip_request_id = prq.id
  WHERE prq.status = 'APPROVED'
    AND (
      p_time_span = 'all' 
      OR (
        -- Check if payslip period overlaps with the selected time range
        -- Period overlaps if: payslip_start <= range_end AND payslip_end >= range_start
        (pr.period_start_date IS NOT NULL AND pr.period_end_date IS NOT NULL
          AND pr.period_start_date::DATE <= v_end_date::DATE
          AND pr.period_end_date::DATE >= v_start_date::DATE)
        OR
        -- Fallback: if period dates are null, use released_at (for backward compatibility)
        (pr.period_start_date IS NULL OR pr.period_end_date IS NULL
          AND pr.released_at >= v_start_date
          AND pr.released_at <= v_end_date)
      )
    );

  -- Calculate net sales (sales - deductions)
  v_net_sales := GREATEST(0.00, v_total_sales - v_total_deductions);

  RETURN QUERY SELECT 
    v_total_sales,
    v_total_deductions,
    v_net_sales;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================
-- To test the function, run:
-- SELECT * FROM get_overall_sales_summary('month');
-- SELECT * FROM get_overall_sales_summary('all');

