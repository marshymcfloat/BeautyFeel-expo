-- ============================================
-- MIGRATION: Fix Commission Type Casting Issues
-- ============================================
-- This migration ensures all type comparisons are properly cast
-- to fix "operator does not exist: text = uuid" errors
-- ============================================

-- ============================================
-- UPDATE apply_commissions_for_booking FUNCTION
-- ============================================
-- Fix type casting in the JOIN condition to ensure both sides are TEXT
CREATE OR REPLACE FUNCTION apply_commissions_for_booking(p_booking_id INTEGER)
RETURNS TABLE(
  employee_id UUID,
  total_commission DECIMAL(10, 2),
  transactions_created INTEGER
) AS $$
DECLARE
  v_service_record RECORD;
  v_employee_record RECORD;
  v_commission DECIMAL(10, 2);
  v_rate DECIMAL(5, 2);
  v_role_text TEXT;
  v_commission_amount DECIMAL(10, 2);
  v_transaction_id UUID;
  v_transactions_created INTEGER := 0;
  v_employee_total DECIMAL(10, 2) := 0.00;
  v_employee_commissions RECORD;
BEGIN
  -- Group services by employee and calculate total commission per employee
  -- Use served_by (not claimed_by) since commissions are only for services that were actually served
  -- IMPORTANT: Cast both sides to TEXT to avoid type mismatch errors
  FOR v_service_record IN
    SELECT 
      sb.id as service_booking_id,
      sb.price_at_booking as service_price,
      sb.served_by,
      sb.status,
      e.id as employee_id,
      e.role as employee_role, -- Single enum value, not array
      e.salary as current_salary
    FROM public.service_bookings sb
    LEFT JOIN public.employee e ON CAST(e.user_id AS TEXT) = CAST(sb.served_by AS TEXT)
    WHERE sb.booking_transaction_id = p_booking_id
      AND sb.status = 'SERVED'
      AND sb.served_by IS NOT NULL
      AND e.id IS NOT NULL
  LOOP
    -- Convert role enum to TEXT for commission calculation
    v_role_text := v_service_record.employee_role::TEXT;
    
    -- Calculate commission for this service (pass as single TEXT value)
    v_commission_amount := calculate_commission(
      v_service_record.service_price,
      v_role_text
    );
    
    IF v_commission_amount > 0 THEN
      -- Get commission rate for this role
      v_rate := get_commission_rate(v_role_text);
      
      -- Create commission transaction record
      INSERT INTO public.commission_transaction (
        employee_id,
        booking_id,
        service_booking_id,
        amount,
        commission_rate,
        service_price,
        role_at_time,
        transaction_type,
        status
      ) VALUES (
        v_service_record.employee_id,
        p_booking_id,
        v_service_record.service_booking_id,
        v_commission_amount,
        v_rate,
        v_service_record.service_price,
        v_role_text, -- Store as single role string
        'ADD',
        'PENDING'
      )
      RETURNING id INTO v_transaction_id;
      
      v_transactions_created := v_transactions_created + 1;
    END IF;
  END LOOP;
  
  -- Now update employee salaries atomically and mark transactions as applied
  FOR v_employee_commissions IN
    SELECT 
      ct.employee_id,
      SUM(ct.amount) as total_commission,
      array_agg(ct.id) as transaction_ids
    FROM public.commission_transaction ct
    WHERE ct.booking_id = p_booking_id
      AND ct.status = 'PENDING'
      AND ct.transaction_type = 'ADD'
    GROUP BY ct.employee_id
  LOOP
    -- Update employee salary (atomic operation)
    UPDATE public.employee
    SET salary = salary + v_employee_commissions.total_commission,
        updated_at = NOW()
    WHERE id = v_employee_commissions.employee_id;
    
    -- Mark all transactions for this employee as applied
    UPDATE public.commission_transaction
    SET status = 'APPLIED',
        applied_at = NOW()
    WHERE id = ANY(v_employee_commissions.transaction_ids);
    
    -- Return row for this employee
    employee_id := v_employee_commissions.employee_id;
    total_commission := v_employee_commissions.total_commission;
    transactions_created := array_length(v_employee_commissions.transaction_ids, 1);
    RETURN NEXT;
  END LOOP;
  
  -- Mark booking as commission processed
  UPDATE public.booking
  SET commission_processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this migration, test with:
-- SELECT * FROM apply_commissions_for_booking(5); -- Replace 5 with your booking ID
-- ============================================

