-- ============================================
-- MIGRATION: Fix Existing Approved Payslips
-- ============================================
-- This migration resets the salary to 0 for employees who have
-- approved payslip requests but still have salary > 0.
-- This fixes the issue where payslips were approved before
-- the salary reset logic was added to the function.
-- ============================================

-- Reset salary to 0 for employees with approved payslip requests
-- and disable their ability to request payslips
UPDATE public.employee e
SET 
  salary = 0.00,
  can_request_payslip = false,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM public.payslip_request pr
  WHERE pr.employee_id = e.id
    AND pr.status = 'APPROVED'
    AND e.salary > 0
);

-- Log how many employees were updated
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % employee(s) with approved payslips to reset salary to 0', v_updated_count;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to verify:
--
-- SELECT 
--   e.id,
--   e.name,
--   e.salary,
--   e.can_request_payslip,
--   COUNT(pr.id) as approved_payslip_count
-- FROM public.employee e
-- LEFT JOIN public.payslip_request pr ON pr.employee_id = e.id AND pr.status = 'APPROVED'
-- WHERE pr.id IS NOT NULL
-- GROUP BY e.id, e.name, e.salary, e.can_request_payslip
-- ORDER BY e.name;

