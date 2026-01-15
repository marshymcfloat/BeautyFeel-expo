-- Migration: Extend email_reminders table for multi-appointment reminders
-- Safe to run multiple times (idempotent)

-- Create enum for reminder type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_type') THEN
    CREATE TYPE reminder_type AS ENUM ('BOOKING', 'APPOINTMENT_STEP');
  END IF;
END $$;

-- Add session_id column (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_reminders' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE email_reminders ADD COLUMN session_id INTEGER REFERENCES customer_appointment_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add step_order column (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_reminders' 
    AND column_name = 'step_order'
  ) THEN
    ALTER TABLE email_reminders ADD COLUMN step_order INTEGER;
  END IF;
END $$;

-- Add reminder_type column (nullable for backward compatibility, defaults to BOOKING)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_reminders' 
    AND column_name = 'reminder_type'
  ) THEN
    ALTER TABLE email_reminders ADD COLUMN reminder_type reminder_type DEFAULT 'BOOKING';
  END IF;
END $$;

-- Update existing rows to have BOOKING type
UPDATE email_reminders SET reminder_type = 'BOOKING' WHERE reminder_type IS NULL;

-- Make booking_id nullable for appointment step reminders
-- This allows appointment step reminders to not require a booking_id
DO $$
BEGIN
  -- Check if booking_id is currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'email_reminders' 
    AND column_name = 'booking_id'
    AND is_nullable = 'NO'
  ) THEN
    -- Make booking_id nullable
    ALTER TABLE email_reminders ALTER COLUMN booking_id DROP NOT NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_reminders_session_id ON email_reminders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_reminders_step_order ON email_reminders(session_id, step_order) WHERE step_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_reminders_reminder_type ON email_reminders(reminder_type);

-- Add comments
COMMENT ON COLUMN email_reminders.session_id IS 'Appointment session ID for multi-appointment reminders (nullable for regular booking reminders)';
COMMENT ON COLUMN email_reminders.step_order IS 'Step order for multi-appointment reminders (nullable for regular booking reminders)';
COMMENT ON COLUMN email_reminders.reminder_type IS 'Type of reminder: BOOKING for regular booking reminders, APPOINTMENT_STEP for multi-appointment step reminders';

