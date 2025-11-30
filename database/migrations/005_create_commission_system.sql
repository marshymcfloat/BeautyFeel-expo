-- ============================================
-- MIGRATION: Create Commission System
-- ============================================
-- This migration creates the commission tracking system
-- for employee commissions when bookings are completed
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE COMMISSION_TRANSACTION TABLE
-- ============================================
-- Track all commission additions and removals for audit and reversibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'commission_transaction'
  ) THEN
    CREATE TABLE public.commission_transaction (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES public.employee(id) ON DELETE CASCADE,
      booking_id INTEGER NOT NULL REFERENCES public.booking(id) ON DELETE CASCADE,
      service_booking_id INTEGER NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      commission_rate DECIMAL(5, 2) NOT NULL,
      service_price DECIMAL(10, 2) NOT NULL,
      role_at_time TEXT NOT NULL, -- Role when commission was calculated
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ADD', 'REVERT')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'REVERTED', 'FAILED')),
      applied_at TIMESTAMPTZ,
      reverted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      
      -- Ensure amount is positive
      CONSTRAINT amount_positive CHECK (amount > 0)
    );

    -- Create indexes for performance
    CREATE INDEX idx_commission_transaction_employee ON public.commission_transaction(employee_id);
    CREATE INDEX idx_commission_transaction_booking ON public.commission_transaction(booking_id);
    CREATE INDEX idx_commission_transaction_service_booking ON public.commission_transaction(service_booking_id);
    CREATE INDEX idx_commission_transaction_status ON public.commission_transaction(status);
    CREATE INDEX idx_commission_transaction_created_at ON public.commission_transaction(created_at);

    RAISE NOTICE 'Created commission_transaction table';
  ELSE
    RAISE NOTICE 'commission_transaction table already exists';
  END IF;
END $$;

-- ============================================
-- 2. ADD COMMISSION TRACKING COLUMNS TO BOOKING
-- ============================================
DO $$
BEGIN
  -- Add commission_processed_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking'
      AND column_name = 'commission_processed_at'
  ) THEN
    ALTER TABLE public.booking
    ADD COLUMN commission_processed_at TIMESTAMPTZ;
    
    CREATE INDEX idx_booking_commission_processed ON public.booking(commission_processed_at);
    
    RAISE NOTICE 'Added commission_processed_at column to booking table';
  END IF;
END $$;

-- ============================================
-- 3. CREATE FUNCTION TO GET COMMISSION RATE
-- ============================================
CREATE OR REPLACE FUNCTION get_commission_rate(p_role TEXT)
RETURNS DECIMAL(5, 2) AS $$
BEGIN
  RETURN CASE 
    WHEN p_role = 'worker' THEN 10.00
    WHEN p_role = 'masseuse' THEN 50.00
    ELSE 0.00
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. CREATE FUNCTION TO CALCULATE COMMISSION
-- ============================================
CREATE OR REPLACE FUNCTION calculate_commission(
  p_service_price DECIMAL,
  p_roles TEXT[]
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_commission DECIMAL(10, 2) := 0.00;
  v_role TEXT;
  v_rate DECIMAL(5, 2);
  v_highest_rate DECIMAL(5, 2) := 0.00;
BEGIN
  -- Use the highest commission rate if employee has multiple roles
  FOREACH v_role IN ARRAY p_roles
  LOOP
    v_rate := get_commission_rate(v_role);
    IF v_rate > v_highest_rate THEN
      v_highest_rate := v_rate;
    END IF;
  END LOOP;
  
  -- Calculate commission based on highest rate
  v_commission := (p_service_price * v_highest_rate) / 100.00;
  
  RETURN ROUND(v_commission, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. CREATE FUNCTION TO CHECK IF ALL SERVICES SERVED FOR 1+ MINUTE
-- ============================================
CREATE OR REPLACE FUNCTION all_services_served_for_minute(p_booking_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_services INTEGER;
  v_served_count INTEGER;
  v_min_served_at TIMESTAMPTZ;
BEGIN
  -- Get total number of service instances in booking
  SELECT COUNT(*) INTO v_total_services
  FROM public.service_bookings
  WHERE booking_transaction_id = p_booking_id;
  
  IF v_total_services = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Count how many are served and get the minimum served timestamp
  -- Use served_at (the service_bookings table doesn't have updated_at)
  SELECT COUNT(*), MIN(served_at)
  INTO v_served_count, v_min_served_at
  FROM public.service_bookings
  WHERE booking_transaction_id = p_booking_id
    AND status = 'SERVED'
    AND served_at IS NOT NULL;
  
  -- All must be served
  IF v_served_count < v_total_services THEN
    RETURN FALSE;
  END IF;
  
  -- All must have been served for at least 1 minute
  IF v_min_served_at IS NULL OR v_min_served_at > (NOW() - INTERVAL '1 minute') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7. CREATE FUNCTION TO APPLY COMMISSIONS FOR BOOKING
-- ============================================
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
  v_role TEXT;
  v_commission_amount DECIMAL(10, 2);
  v_transaction_id UUID;
  v_transactions_created INTEGER := 0;
  v_employee_total DECIMAL(10, 2) := 0.00;
  v_employee_commissions RECORD;
BEGIN
  -- Group services by employee and calculate total commission per employee
  FOR v_service_record IN
    SELECT 
      sb.id as service_booking_id,
      sb.price_at_booking as service_price,
      sb.claimed_by,
      sb.status,
      e.id as employee_id,
      e.role as employee_roles,
      e.salary as current_salary
    FROM public.service_bookings sb
    LEFT JOIN public.employee e ON e.user_id::TEXT = sb.claimed_by
    WHERE sb.booking_transaction_id = p_booking_id
      AND sb.status = 'SERVED'
      AND sb.claimed_by IS NOT NULL
      AND e.id IS NOT NULL
  LOOP
    -- Calculate commission for this service
    v_commission_amount := calculate_commission(
      v_service_record.service_price,
      v_service_record.employee_roles
    );
    
    IF v_commission_amount > 0 THEN
      -- Find highest commission rate for this employee's roles
      v_rate := 0.00;
      FOREACH v_role IN ARRAY v_service_record.employee_roles
      LOOP
        IF get_commission_rate(v_role) > v_rate THEN
          v_rate := get_commission_rate(v_role);
        END IF;
      END LOOP;
      
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
        array_to_string(v_service_record.employee_roles, ', '),
        'ADD',
        'PENDING'
      )
      RETURNING id INTO v_transaction_id;
      
      v_transactions_created := v_transactions_created + 1;
      
      -- Accumulate commission for this employee
      -- We'll update salary in a separate step to avoid race conditions
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
-- 8. CREATE FUNCTION TO REVERT COMMISSIONS FOR BOOKING
-- ============================================
CREATE OR REPLACE FUNCTION revert_commissions_for_booking(p_booking_id INTEGER)
RETURNS TABLE(
  employee_id UUID,
  reverted_amount DECIMAL(10, 2),
  new_salary DECIMAL(10, 2)
) AS $$
DECLARE
  v_transaction RECORD;
  v_current_salary DECIMAL(10, 2);
  v_new_salary DECIMAL(10, 2);
  v_reverted_amount DECIMAL(10, 2);
BEGIN
  -- Process all applied transactions for this booking
  FOR v_transaction IN
    SELECT 
      ct.*,
      e.salary as current_salary
    FROM public.commission_transaction ct
    JOIN public.employee e ON e.id = ct.employee_id
    WHERE ct.booking_id = p_booking_id
      AND ct.transaction_type = 'ADD'
      AND ct.status = 'APPLIED'
      AND NOT EXISTS (
        SELECT 1 FROM public.commission_transaction ct2
        WHERE ct2.booking_id = p_booking_id
          AND ct2.service_booking_id = ct.service_booking_id
          AND ct2.transaction_type = 'REVERT'
          AND ct2.status IN ('APPLIED', 'PENDING')
      )
  LOOP
    v_current_salary := v_transaction.current_salary;
    v_reverted_amount := v_transaction.amount;
    v_new_salary := GREATEST(0.00, v_current_salary - v_reverted_amount); -- Prevent negative salary
    
    -- Create revert transaction record
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
      v_transaction.employee_id,
      v_transaction.booking_id,
      v_transaction.service_booking_id,
      v_reverted_amount,
      v_transaction.commission_rate,
      v_transaction.service_price,
      v_transaction.role_at_time,
      'REVERT',
      'PENDING'
    );
    
    -- Update employee salary (atomic, prevent negative)
    UPDATE public.employee
    SET salary = v_new_salary,
        updated_at = NOW()
    WHERE id = v_transaction.employee_id;
    
    -- Mark original transaction as reverted
    UPDATE public.commission_transaction
    SET status = 'REVERTED',
        reverted_at = NOW()
    WHERE id = v_transaction.id;
    
    -- Mark revert transaction as applied
    -- Use subquery approach since LIMIT is not allowed in UPDATE
    UPDATE public.commission_transaction
    SET status = 'APPLIED',
        applied_at = NOW()
    WHERE id = (
      SELECT id
      FROM public.commission_transaction
      WHERE booking_id = p_booking_id
        AND service_booking_id = v_transaction.service_booking_id
        AND transaction_type = 'REVERT'
        AND status = 'PENDING'
      LIMIT 1
    );
    
    -- Return row for this employee
    employee_id := v_transaction.employee_id;
    reverted_amount := v_reverted_amount;
    new_salary := v_new_salary;
    RETURN NEXT;
  END LOOP;
  
  -- Clear commission_processed_at from booking
  UPDATE public.booking
  SET commission_processed_at = NULL,
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. CREATE MANUAL CHECK FUNCTION FOR COMMISSIONS
-- ============================================
CREATE OR REPLACE FUNCTION check_and_apply_commissions_manual(p_booking_id INTEGER)
RETURNS TABLE(
  applied BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_all_served BOOLEAN;
  v_commission_processed BOOLEAN;
  v_result RECORD;
BEGIN
  -- Check if commission already processed
  SELECT commission_processed_at IS NOT NULL INTO v_commission_processed
  FROM public.booking
  WHERE id = p_booking_id;
  
  IF v_commission_processed THEN
    applied := FALSE;
    message := 'Commissions already processed for this booking';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check if all services served for 1+ minute
  SELECT all_services_served_for_minute(p_booking_id) INTO v_all_served;
  
  IF NOT v_all_served THEN
    applied := FALSE;
    message := 'Not all services have been served for 1+ minute';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Apply commissions
  FOR v_result IN SELECT * FROM apply_commissions_for_booking(p_booking_id)
  LOOP
    -- Commission applied for each employee
    NULL;
  END LOOP;
  
  applied := TRUE;
  message := 'Commissions applied successfully';
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. CREATE TRIGGER FUNCTION TO CHECK AND APPLY COMMISSIONS
-- ============================================
CREATE OR REPLACE FUNCTION check_and_apply_commissions()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id INTEGER;
  v_commission_processed BOOLEAN;
BEGIN
  -- Only process if status changed to SERVED
  IF NEW.status = 'SERVED' AND (OLD.status IS NULL OR OLD.status != 'SERVED') THEN
    v_booking_id := NEW.booking_transaction_id;
    
    -- Only process if booking_id is valid
    IF v_booking_id IS NOT NULL THEN
      -- Check if commission already processed for this booking
      SELECT commission_processed_at IS NOT NULL INTO v_commission_processed
      FROM public.booking
      WHERE id = v_booking_id;
      
      -- Only process if not already processed
      IF NOT v_commission_processed THEN
        -- Check if all services are served for 1+ minute (async check)
        -- Note: This will be checked when the function is called, not in trigger
        -- The trigger just marks that a service was served
        PERFORM pg_notify('service_served', json_build_object(
          'booking_id', v_booking_id,
          'service_booking_id', NEW.id
        )::text);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on service_bookings
DROP TRIGGER IF EXISTS trigger_check_commissions ON public.service_bookings;

CREATE TRIGGER trigger_check_commissions
  AFTER UPDATE OF status ON public.service_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'SERVED' AND (OLD.status IS NULL OR OLD.status != 'SERVED'))
  EXECUTE FUNCTION check_and_apply_commissions();

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify the migration:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'commission_transaction'
-- ORDER BY ordinal_position;
--
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname LIKE '%commission%' OR proname LIKE '%revert%';
--
-- ============================================

