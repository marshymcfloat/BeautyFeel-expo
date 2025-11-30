-- ============================================
-- MIGRATION: Fix all_services_served_for_minute function
-- ============================================
-- This migration fixes the function to remove reference to non-existent updated_at column
-- ============================================

-- ============================================
-- UPDATE all_services_served_for_minute FUNCTION
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
  -- Note: service_bookings table doesn't have updated_at, only served_at
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
-- VERIFICATION
-- ============================================
-- Test the function with an existing booking:
-- SELECT all_services_served_for_minute(5); -- Replace 5 with your booking ID
-- ============================================

