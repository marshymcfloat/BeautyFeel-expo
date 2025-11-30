-- MIGRATION: Create Email Reminders Tracking Table
-- This table tracks which reminder emails have been sent to avoid duplicates

CREATE TABLE IF NOT EXISTS email_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id INTEGER NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  reminder_minutes INTEGER NOT NULL, -- 60, 30, or 10
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure we don't send duplicate reminders
  UNIQUE(booking_id, reminder_minutes)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_reminders_booking_id ON email_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_sent_at ON email_reminders(sent_at);

-- Add comment
COMMENT ON TABLE email_reminders IS 'Tracks which reminder emails have been sent to customers to avoid duplicates';

