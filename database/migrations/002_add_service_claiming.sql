-- ============================================
-- MIGRATION: Add Service Instance Claiming
-- ============================================
-- This adds fields to track which user is serving each service instance
-- and prevents double-claiming with real-time updates
-- ============================================

-- Add status enum for service_bookings
DO $$
BEGIN
  -- Check if enum type exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_instance_status') THEN
    CREATE TYPE service_instance_status AS ENUM ('UNCLAIMED', 'CLAIMED', 'SERVED');
  END IF;
END $$;

-- Add status column to service_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE service_bookings 
    ADD COLUMN status service_instance_status DEFAULT 'UNCLAIMED' NOT NULL;
  END IF;
END $$;

-- Add claimed_by (user ID who claimed this service instance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE service_bookings 
    ADD COLUMN claimed_by TEXT; -- Using TEXT to store auth.users id
  END IF;
END $$;

-- Add claimed_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE service_bookings 
    ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_bookings_status 
  ON service_bookings(status) 
  WHERE status != 'SERVED';

CREATE INDEX IF NOT EXISTS idx_service_bookings_claimed_by 
  ON service_bookings(claimed_by) 
  WHERE claimed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_bookings_booking_id_status 
  ON service_bookings(booking_transaction_id, status);

-- Add constraint: served_by should match claimed_by
-- (If someone claims it, they should serve it)
-- This is just a comment - actual constraint handled in application logic

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Next steps:
-- 1. Enable Realtime on service_bookings table in Supabase Dashboard
--    - Go to Database > Replication
--    - Enable replication for 'service_bookings' table
-- 2. Enable Realtime on booking table as well
-- 3. Run: npm run generate:types
-- ============================================

