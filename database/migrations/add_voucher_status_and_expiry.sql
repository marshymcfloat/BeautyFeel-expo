-- Add voucher status enum type
DO $$ BEGIN
  CREATE TYPE voucher_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add expires_on column (optional date)
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS expires_on DATE;

-- Add status column with default 'ACTIVE'
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS status voucher_status DEFAULT 'ACTIVE'::voucher_status NOT NULL;

-- Migrate existing data: Set status based on used_at
UPDATE voucher 
SET status = CASE 
  WHEN used_at IS NOT NULL THEN 'USED'::voucher_status
  ELSE 'ACTIVE'::voucher_status
END;

-- Set expired status for vouchers that have expired (if expires_on exists)
-- This will be handled by application logic, but we can set it here if needed
-- UPDATE voucher 
-- SET status = 'EXPIRED'::voucher_status
-- WHERE expires_on IS NOT NULL 
--   AND expires_on < CURRENT_DATE 
--   AND status = 'ACTIVE'::voucher_status;

-- Drop used_at column (after migration)
ALTER TABLE voucher DROP COLUMN IF EXISTS used_at;

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_voucher_status ON voucher(status);

-- Create index on expires_on for faster expiration checks
CREATE INDEX IF NOT EXISTS idx_voucher_expires_on ON voucher(expires_on) WHERE expires_on IS NOT NULL;

-- Create function to automatically update status to EXPIRED
CREATE OR REPLACE FUNCTION update_expired_vouchers()
RETURNS void AS $$
BEGIN
  UPDATE voucher
  SET status = 'EXPIRED'::voucher_status
  WHERE expires_on IS NOT NULL
    AND expires_on < CURRENT_DATE
    AND status = 'ACTIVE'::voucher_status;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to check expiration on voucher access
-- Or call update_expired_vouchers() periodically via cron job

