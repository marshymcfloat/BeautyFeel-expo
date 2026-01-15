-- Migration: Create customer_appointment_sessions table
-- This table tracks customer progress through multi-appointment services
-- Safe to run multiple times (idempotent)

-- Create enum for session status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_session_status') THEN
    CREATE TYPE appointment_session_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customer_appointment_sessions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES service(id) ON DELETE RESTRICT,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step > 0),
  status appointment_session_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_appointment_sessions_customer_id ON customer_appointment_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_appointment_sessions_service_id ON customer_appointment_sessions(service_id);
CREATE INDEX IF NOT EXISTS idx_customer_appointment_sessions_status ON customer_appointment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_customer_appointment_sessions_customer_status ON customer_appointment_sessions(customer_id, status);

-- Ensure one active session per customer-service combination
-- Note: This allows multiple completed sessions but only one IN_PROGRESS per customer-service
-- Using a partial unique index instead of UNIQUE constraint with WHERE clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_appointment_sessions_unique_active 
ON customer_appointment_sessions(customer_id, service_id) 
WHERE status = 'IN_PROGRESS';

-- Add comments
COMMENT ON TABLE customer_appointment_sessions IS 'Tracks customer progress through multi-appointment services';
COMMENT ON COLUMN customer_appointment_sessions.customer_id IS 'The customer this session belongs to';
COMMENT ON COLUMN customer_appointment_sessions.service_id IS 'The multi-appointment service this session is for';
COMMENT ON COLUMN customer_appointment_sessions.current_step IS 'Current step number (1-based) the customer is on';
COMMENT ON COLUMN customer_appointment_sessions.status IS 'Status of the appointment session';
COMMENT ON COLUMN customer_appointment_sessions.started_at IS 'When the first appointment was booked';
COMMENT ON COLUMN customer_appointment_sessions.completed_at IS 'When all appointments were completed';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_appointment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_customer_appointment_sessions_updated_at ON customer_appointment_sessions;
CREATE TRIGGER trigger_update_customer_appointment_sessions_updated_at
  BEFORE UPDATE ON customer_appointment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_appointment_sessions_updated_at();

