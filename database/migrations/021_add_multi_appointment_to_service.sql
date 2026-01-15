-- Migration: Add multi-appointment fields to service table
-- This allows services to specify if they require multiple appointments
-- Safe to run multiple times (idempotent)

-- Add requires_appointments column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'requires_appointments'
  ) THEN
    ALTER TABLE service ADD COLUMN requires_appointments BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Add total_appointments column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'total_appointments'
  ) THEN
    ALTER TABLE service ADD COLUMN total_appointments INTEGER;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN service.requires_appointments IS 'Whether this service requires multiple appointments/sessions';
COMMENT ON COLUMN service.total_appointments IS 'Total number of required appointments/sessions for this service';

