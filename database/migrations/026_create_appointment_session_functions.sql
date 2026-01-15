-- Migration: Create RPC functions for appointment session management
-- Safe to run multiple times (idempotent)

-- ============================================
-- FUNCTION: get_upcoming_appointment_sessions
-- ============================================
-- Get customer's incomplete appointment sessions with next step information
CREATE OR REPLACE FUNCTION get_upcoming_appointment_sessions(p_customer_id INTEGER)
RETURNS TABLE(
  session_id INTEGER,
  service_id INTEGER,
  service_title TEXT,
  current_step INTEGER,
  total_steps INTEGER,
  next_step_order INTEGER,
  next_service_id INTEGER,
  next_service_title TEXT,
  next_step_label TEXT,
  recommended_after_days INTEGER,
  last_appointment_date DATE,
  next_recommended_date DATE,
  status TEXT,
  started_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cas.id AS session_id,
    cas.service_id,
    s.title::TEXT AS service_title,
    cas.current_step,
    s.total_appointments AS total_steps,
    sas.step_order AS next_step_order,
    sas.service_id_for_step AS next_service_id,
    next_s.title::TEXT AS next_service_title,
    sas.label::TEXT AS next_step_label,
    sas.recommended_after_days,
    -- Get the last attended appointment date
    (
      SELECT MAX(b.appointment_date)
      FROM appointment_session_bookings asb
      JOIN booking b ON asb.booking_id = b.id
      WHERE asb.session_id = cas.id
        AND asb.attended_at IS NOT NULL
    ) AS last_appointment_date,
    -- Calculate next recommended date
    (
      SELECT MAX(b.appointment_date) + (sas.recommended_after_days || ' days')::INTERVAL
      FROM appointment_session_bookings asb
      JOIN booking b ON asb.booking_id = b.id
      WHERE asb.session_id = cas.id
        AND asb.attended_at IS NOT NULL
    )::DATE AS next_recommended_date,
    cas.status::TEXT,
    cas.started_at
  FROM customer_appointment_sessions cas
  JOIN service s ON cas.service_id = s.id
  LEFT JOIN service_appointment_steps sas ON 
    sas.service_id = cas.service_id 
    AND sas.step_order = cas.current_step
  LEFT JOIN service next_s ON sas.service_id_for_step = next_s.id
  WHERE cas.customer_id = p_customer_id
    AND cas.status = 'IN_PROGRESS'
  ORDER BY cas.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_upcoming_appointment_sessions(INTEGER) IS 'Gets customer''s incomplete appointment sessions with next step information';

-- ============================================
-- FUNCTION: mark_appointment_attended
-- ============================================
-- Mark an appointment step as attended and advance the session
CREATE OR REPLACE FUNCTION mark_appointment_attended(
  p_session_id INTEGER,
  p_booking_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_current_step INTEGER;
  v_total_steps INTEGER;
  v_step_order INTEGER;
  v_session_status TEXT;
  v_attended_steps_count INTEGER;
  v_result JSON;
BEGIN
  -- Get current session info
  SELECT cas.current_step, s.total_appointments, cas.status::TEXT
  INTO v_current_step, v_total_steps, v_session_status
  FROM customer_appointment_sessions cas
  JOIN service s ON cas.service_id = s.id
  WHERE cas.id = p_session_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found'
    );
  END IF;

  IF v_session_status != 'IN_PROGRESS' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session is not in progress'
    );
  END IF;

  -- Get the step order for this booking
  SELECT asb.step_order INTO v_step_order
  FROM appointment_session_bookings asb
  WHERE asb.session_id = p_session_id
    AND asb.booking_id = p_booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not linked to this session'
    );
  END IF;

  -- Update attended_at for this booking
  UPDATE appointment_session_bookings
  SET attended_at = NOW()
  WHERE session_id = p_session_id
    AND booking_id = p_booking_id;

  -- Advance current_step if this was the current step
  IF v_step_order = v_current_step THEN
    -- Check if there are more steps
    IF v_current_step < v_total_steps THEN
      -- Advance to next step
      UPDATE customer_appointment_sessions
      SET current_step = current_step + 1,
          updated_at = NOW()
      WHERE id = p_session_id;
      
      v_current_step := v_current_step + 1;
    ELSIF v_current_step >= v_total_steps THEN
      -- All steps completed - mark session as COMPLETED
      UPDATE customer_appointment_sessions
      SET status = 'COMPLETED',
          completed_at = NOW(),
          updated_at = NOW(),
          current_step = v_total_steps
      WHERE id = p_session_id;
      
      v_current_step := v_total_steps;
    END IF;
  END IF;

  -- After updating, check if all steps have been attended
  -- This handles cases where steps might be completed out of order
  SELECT COUNT(DISTINCT step_order) INTO v_attended_steps_count
  FROM appointment_session_bookings
  WHERE session_id = p_session_id
    AND attended_at IS NOT NULL;
  
  -- If all steps have been attended, mark session as COMPLETED
  IF v_attended_steps_count >= v_total_steps THEN
    UPDATE customer_appointment_sessions
    SET status = 'COMPLETED',
        completed_at = COALESCE(completed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_session_id
      AND status != 'COMPLETED';
  END IF;

  -- Check final status after update
  SELECT status::TEXT INTO v_session_status
  FROM customer_appointment_sessions
  WHERE id = p_session_id;

  RETURN json_build_object(
    'success', true,
    'current_step', v_current_step,
    'total_steps', v_total_steps,
    'is_completed', v_session_status = 'COMPLETED',
    'status', v_session_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_appointment_attended(INTEGER, INTEGER) IS 'Marks an appointment step as attended and advances the session progress';

-- ============================================
-- FUNCTION: get_next_recommended_appointment_date
-- ============================================
-- Calculate the next recommended appointment date for a session
CREATE OR REPLACE FUNCTION get_next_recommended_appointment_date(p_session_id INTEGER)
RETURNS DATE AS $$
DECLARE
  v_last_appointment_date DATE;
  v_recommended_after_days INTEGER;
  v_next_date DATE;
BEGIN
  -- Get the last attended appointment date
  SELECT MAX(b.appointment_date) INTO v_last_appointment_date
  FROM appointment_session_bookings asb
  JOIN booking b ON asb.booking_id = b.id
  WHERE asb.session_id = p_session_id
    AND asb.attended_at IS NOT NULL;

  -- If no previous appointment, use session start date
  IF v_last_appointment_date IS NULL THEN
    SELECT started_at::DATE INTO v_last_appointment_date
    FROM customer_appointment_sessions
    WHERE id = p_session_id;
  END IF;

  -- Get recommended_after_days for the next step
  SELECT sas.recommended_after_days INTO v_recommended_after_days
  FROM customer_appointment_sessions cas
  JOIN service_appointment_steps sas ON 
    sas.service_id = cas.service_id 
    AND sas.step_order = cas.current_step
  WHERE cas.id = p_session_id;

  -- If no step found, return NULL
  IF v_recommended_after_days IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate next recommended date
  v_next_date := v_last_appointment_date + (v_recommended_after_days || ' days')::INTERVAL;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_next_recommended_appointment_date(INTEGER) IS 'Calculates the next recommended appointment date for a session based on last appointment and recommended_after_days';

-- ============================================
-- FUNCTION: check_and_send_appointment_reminders
-- ============================================
-- Check for sessions that need reminders and return them
-- This function returns sessions that need reminders (1-3 days before recommended date)
CREATE OR REPLACE FUNCTION check_and_send_appointment_reminders()
RETURNS TABLE(
  session_id INTEGER,
  customer_id INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  service_title TEXT,
  current_step INTEGER,
  next_step_label TEXT,
  next_recommended_date DATE,
  days_until_appointment INTEGER
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_reminder_start_date DATE := v_today + INTERVAL '1 day';
  v_reminder_end_date DATE := v_today + INTERVAL '3 days';
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    cas.id AS session_id,
    cas.customer_id,
    c.name AS customer_name,
    c.email AS customer_email,
    s.title AS service_title,
    cas.current_step,
    sas.label AS next_step_label,
    get_next_recommended_appointment_date(cas.id) AS next_recommended_date,
    (get_next_recommended_appointment_date(cas.id) - v_today)::INTEGER AS days_until_appointment
  FROM customer_appointment_sessions cas
  JOIN customer c ON cas.customer_id = c.id
  JOIN service s ON cas.service_id = s.id
  JOIN service_appointment_steps sas ON 
    sas.service_id = cas.service_id 
    AND sas.step_order = cas.current_step
  WHERE cas.status = 'IN_PROGRESS'
    AND c.email IS NOT NULL
    AND get_next_recommended_appointment_date(cas.id) IS NOT NULL
    AND get_next_recommended_appointment_date(cas.id) >= v_reminder_start_date
    AND get_next_recommended_appointment_date(cas.id) <= v_reminder_end_date
    -- Check if reminder hasn't been sent for this step
    AND NOT EXISTS (
      SELECT 1
      FROM email_reminders er
      WHERE er.session_id = cas.id
        AND er.step_order = cas.current_step
        AND er.reminder_type = 'APPOINTMENT_STEP'
        AND er.sent_at::DATE >= v_today - INTERVAL '1 day'
    )
  ORDER BY next_recommended_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_and_send_appointment_reminders() IS 'Returns sessions that need appointment reminders (1-3 days before recommended date)';

