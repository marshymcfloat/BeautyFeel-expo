-- Migration: Create appointment_session_bookings table
-- This table links bookings to appointment sessions
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS appointment_session_bookings (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES customer_appointment_sessions(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one booking per step per session
  UNIQUE(session_id, step_order)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_session_bookings_session_id ON appointment_session_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_appointment_session_bookings_booking_id ON appointment_session_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_appointment_session_bookings_step_order ON appointment_session_bookings(session_id, step_order);
CREATE INDEX IF NOT EXISTS idx_appointment_session_bookings_attended_at ON appointment_session_bookings(attended_at) WHERE attended_at IS NOT NULL;

-- Add comments
COMMENT ON TABLE appointment_session_bookings IS 'Links bookings to appointment sessions to track which step each booking fulfills';
COMMENT ON COLUMN appointment_session_bookings.session_id IS 'The appointment session this booking belongs to';
COMMENT ON COLUMN appointment_session_bookings.booking_id IS 'The booking that fulfills this step';
COMMENT ON COLUMN appointment_session_bookings.step_order IS 'Which step (1st, 2nd, 3rd, etc.) this booking fulfills';
COMMENT ON COLUMN appointment_session_bookings.attended_at IS 'When the customer attended this appointment';

