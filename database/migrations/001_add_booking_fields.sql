-- ============================================
-- MIGRATION: Add Critical Booking Fields
-- ============================================
-- This migration adds essential fields needed for the booking system
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. UPDATE BOOKING_STATUS ENUM
-- ============================================
-- Add new status values to the existing enum
-- Note: PostgreSQL doesn't support removing enum values, so we need to create a new one

-- Check if enum already has all values we need
DO $$
BEGIN
  -- Try to add new enum values (will fail silently if they exist)
  BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'CONFIRMED';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'COMPLETED';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'NO_SHOW';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================
-- 2. ADD CRITICAL FIELDS TO BOOKING TABLE
-- ============================================

-- Add appointment_date (CRITICAL - Required for scheduling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'appointment_date'
  ) THEN
    ALTER TABLE booking ADD COLUMN appointment_date DATE;
  END IF;
END $$;

-- Add appointment_time (CRITICAL - Required for scheduling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'appointment_time'
  ) THEN
    ALTER TABLE booking ADD COLUMN appointment_time TIME;
  END IF;
END $$;

-- Add duration_minutes (CRITICAL - Required for scheduling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE booking ADD COLUMN duration_minutes INTEGER;
  END IF;
END $$;

-- Add location (Required for UI - shows "Salon Studio A", etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE booking ADD COLUMN location VARCHAR(255);
  END IF;
END $$;

-- Add notes (Optional but useful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE booking ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Add status timestamps for better tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE booking ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE booking ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE booking ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE booking ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE booking ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- Add voucher_id to link bookings with vouchers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'voucher_id'
  ) THEN
    ALTER TABLE booking ADD COLUMN voucher_id INTEGER REFERENCES voucher(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'booking' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE booking ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- 3. CRITICAL FIX: ADD SERVICE_ID TO SERVICE_BOOKINGS
-- ============================================
-- This is CRITICAL - currently there's no way to link which service is booked!

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'service_id'
  ) THEN
    ALTER TABLE service_bookings ADD COLUMN service_id INTEGER REFERENCES service(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Make service_id required (after adding it, you may want to backfill existing data)
-- Uncomment this after you've populated service_id for existing records:
-- ALTER TABLE service_bookings ALTER COLUMN service_id SET NOT NULL;

-- Add quantity (how many times the service is booked, default 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'quantity'
  ) THEN
    ALTER TABLE service_bookings ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;
  END IF;
END $$;

-- Add price_at_booking (snapshot of price when booked)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'price_at_booking'
  ) THEN
    ALTER TABLE service_bookings ADD COLUMN price_at_booking NUMERIC(10, 2);
  END IF;
END $$;

-- Add sequence_order (order of services in booking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service_bookings' 
    AND column_name = 'sequence_order'
  ) THEN
    ALTER TABLE service_bookings ADD COLUMN sequence_order INTEGER DEFAULT 1;
  END IF;
END $$;

-- ============================================
-- 4. ADD DURATION_MINUTES TO SERVICE TABLE
-- ============================================
-- Required to calculate total booking duration

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE service ADD COLUMN duration_minutes INTEGER DEFAULT 60 NOT NULL;
  END IF;
END $$;

-- Add other useful service fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE service ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE service ADD COLUMN category VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE service ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'service' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE service ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- 5. ADD PHONE TO CUSTOMER TABLE
-- ============================================
-- Useful for booking confirmations

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customer' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE customer ADD COLUMN phone VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customer' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE customer ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for querying bookings by date (most common query)
CREATE INDEX IF NOT EXISTS idx_booking_appointment_date 
  ON booking(appointment_date);

-- Index for querying bookings by status
CREATE INDEX IF NOT EXISTS idx_booking_status 
  ON booking(status);

-- Composite index for date + time queries
CREATE INDEX IF NOT EXISTS idx_booking_date_time 
  ON booking(appointment_date, appointment_time) 
  WHERE appointment_date IS NOT NULL;

-- Index for service_bookings lookups
CREATE INDEX IF NOT EXISTS idx_service_bookings_booking_id 
  ON service_bookings(booking_transaction_id);

CREATE INDEX IF NOT EXISTS idx_service_bookings_service_id 
  ON service_bookings(service_id) 
  WHERE service_id IS NOT NULL;

-- ============================================
-- 7. CREATE AUTO-UPDATE TRIGGERS
-- ============================================
-- Automatically update updated_at timestamp

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_booking_updated_at ON booking;
CREATE TRIGGER update_booking_updated_at 
  BEFORE UPDATE ON booking
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_updated_at ON service;
CREATE TRIGGER update_service_updated_at 
  BEFORE UPDATE ON service
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_updated_at ON customer;
CREATE TRIGGER update_customer_updated_at 
  BEFORE UPDATE ON customer
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Next steps:
-- 1. Run: npm run generate:types (to update TypeScript types)
-- 2. Backfill service_id in service_bookings for existing records
-- 3. Backfill appointment_date/time for existing bookings if needed
-- ============================================

