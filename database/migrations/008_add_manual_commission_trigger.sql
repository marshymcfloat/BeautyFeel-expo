-- ============================================
-- MIGRATION: Add Manual Commission Trigger Function
-- ============================================
-- This migration adds a function to manually trigger commissions
-- for services that were already served but commissions weren't applied
-- ============================================

-- ============================================
-- CREATE FUNCTION TO MANUALLY APPLY COMMISSIONS FOR SERVED SERVICES
-- ============================================
CREATE OR REPLACE FUNCTION apply_missing_commissions_for_served_services()
RETURNS TABLE(
  booking_id INTEGER,
  employee_id UUID,
  commission_amount DECIMAL(10, 2),
  services_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_booking_record RECORD;
  v_result RECORD;
  v_total_commissions DECIMAL(10, 2);
BEGIN
  -- Find all bookings with served services that don't have commissions processed
  FOR v_booking_record IN
    SELECT DISTINCT sb.booking_transaction_id as booking_id
    FROM public.service_bookings sb
    WHERE sb.status = 'SERVED'
      AND sb.served_by IS NOT NULL
      AND sb.served_at IS NOT NULL
      AND sb.served_at < (NOW() - INTERVAL '1 minute')
      AND NOT EXISTS (
        SELECT 1 FROM public.booking b
        WHERE b.id = sb.booking_transaction_id
        AND b.commission_processed_at IS NOT NULL
      )
  LOOP
    -- Check if all services in this booking are served for 1+ minute
    IF all_services_served_for_minute(v_booking_record.booking_id) THEN
      -- Apply commissions for this booking
      FOR v_result IN 
        SELECT * FROM apply_commissions_for_booking(v_booking_record.booking_id)
      LOOP
        booking_id := v_booking_record.booking_id;
        employee_id := v_result.employee_id;
        commission_amount := v_result.total_commission;
        services_count := v_result.transactions_created;
        message := 'Commissions applied successfully';
        RETURN NEXT;
      END LOOP;
      
      -- If no commissions were created, return a message
      IF NOT FOUND THEN
        booking_id := v_booking_record.booking_id;
        employee_id := NULL;
        commission_amount := 0.00;
        services_count := 0;
        message := 'No commissions created - check employee roles and commission rates';
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this function to apply missing commissions:
-- SELECT * FROM apply_missing_commissions_for_served_services();
-- ============================================

