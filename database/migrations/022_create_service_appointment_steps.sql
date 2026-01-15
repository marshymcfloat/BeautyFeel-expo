-- Migration: Create service_appointment_steps table
-- This table defines the appointment steps for multi-appointment services
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS service_appointment_steps (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  service_id_for_step INTEGER NOT NULL REFERENCES service(id) ON DELETE RESTRICT,
  recommended_after_days INTEGER NOT NULL CHECK (recommended_after_days >= 0),
  label VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique step order per service
  UNIQUE(service_id, step_order)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_appointment_steps_service_id ON service_appointment_steps(service_id);
CREATE INDEX IF NOT EXISTS idx_service_appointment_steps_service_id_for_step ON service_appointment_steps(service_id_for_step);
CREATE INDEX IF NOT EXISTS idx_service_appointment_steps_step_order ON service_appointment_steps(service_id, step_order);

-- Add comments
COMMENT ON TABLE service_appointment_steps IS 'Defines appointment steps for multi-appointment services';
COMMENT ON COLUMN service_appointment_steps.service_id IS 'The multi-appointment service this step belongs to';
COMMENT ON COLUMN service_appointment_steps.step_order IS 'Order of this step (1st, 2nd, 3rd, etc.)';
COMMENT ON COLUMN service_appointment_steps.service_id_for_step IS 'The service to book for this step (can be same or different service)';
COMMENT ON COLUMN service_appointment_steps.recommended_after_days IS 'Days after previous appointment this step should be scheduled';
COMMENT ON COLUMN service_appointment_steps.label IS 'Optional label for this step (e.g., "Initial", "Follow-Up", "Final Session")';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_appointment_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_service_appointment_steps_updated_at ON service_appointment_steps;
CREATE TRIGGER trigger_update_service_appointment_steps_updated_at
  BEFORE UPDATE ON service_appointment_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_service_appointment_steps_updated_at();

