-- ============================================
-- BOOKINGS SYSTEM DATABASE SCHEMA
-- ============================================
-- This document outlines the tables needed for a complete booking system
-- Based on existing schema in database.types.ts and UI requirements

-- ============================================
-- EXISTING TABLES (to be modified/enhanced)
-- ============================================

-- 1. CUSTOMER TABLE (Already exists - may need enhancements)
-- Current: id, name, email, spent, last_transaction, created_at
CREATE TABLE IF NOT EXISTS customer (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20), -- ADD THIS: Phone number for bookings
  address TEXT, -- ADD THIS: Customer address
  notes TEXT, -- ADD THIS: Special notes about customer
  spent NUMERIC(10, 2) DEFAULT 0,
  last_transaction TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SERVICE TABLE (Needs enhancements)
-- Current: id, title, price, created_at
CREATE TABLE IF NOT EXISTS service (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT, -- ADD THIS: Service description
  price NUMERIC(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60, -- ADD THIS: Service duration
  category VARCHAR(100), -- ADD THIS: e.g., "Hair", "Nails", "Makeup"
  is_active BOOLEAN DEFAULT TRUE, -- ADD THIS: Enable/disable services
  image_url TEXT, -- ADD THIS: Service image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BOOKING TABLES (Major enhancements needed)
-- ============================================

-- 3. BOOKING TABLE (Needs major enhancements)
-- Current: id, customer_id, grandTotal, grandDiscount, status, created_at
CREATE TABLE IF NOT EXISTS booking (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
  
  -- Appointment scheduling
  appointment_date DATE NOT NULL, -- ADD THIS: Date of appointment
  appointment_time TIME NOT NULL, -- ADD THIS: Time of appointment
  duration_minutes INTEGER NOT NULL, -- ADD THIS: Total duration of all services
  
  -- Location and staff
  location VARCHAR(255), -- ADD THIS: e.g., "Salon Studio A", "Nail Station B", "VIP Suite"
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL, -- ADD THIS: Assigned staff member
  
  -- Financial
  grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  grand_discount NUMERIC(10, 2) DEFAULT 0,
  final_total NUMERIC(10, 2) NOT NULL, -- ADD THIS: grand_total - grand_discount
  
  -- Status management
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
    CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  
  -- Additional fields
  voucher_id INTEGER REFERENCES voucher(id) ON DELETE SET NULL, -- ADD THIS: Applied voucher
  notes TEXT, -- ADD THIS: Booking notes/comments
  cancellation_reason TEXT, -- ADD THIS: Reason if cancelled
  cancelled_at TIMESTAMP WITH TIME ZONE, -- ADD THIS: When was it cancelled
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE, -- ADD THIS: When was it confirmed
  started_at TIMESTAMP WITH TIME ZONE, -- ADD THIS: When service started
  completed_at TIMESTAMP WITH TIME ZONE -- ADD THIS: When service completed
);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_booking_appointment_date ON booking(appointment_date);
CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status);
CREATE INDEX IF NOT EXISTS idx_booking_customer ON booking(customer_id);

-- ============================================
-- NEW TABLES NEEDED
-- ============================================

-- 4. STAFF TABLE (NEW - for staff/employee management)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  specializations TEXT[], -- Array of service categories they can do
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SERVICE_BOOKINGS TABLE (FIXED - Missing service_id!)
-- Current issues: Missing service_id, missing quantity, missing price_at_booking
CREATE TABLE IF NOT EXISTS service_bookings (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES service(id) ON DELETE RESTRICT,
  
  -- Pricing (capture price at booking time in case service price changes)
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_booking NUMERIC(10, 2) NOT NULL, -- Price when booked (snapshot)
  discount_amount NUMERIC(10, 2) DEFAULT 0, -- Discount for this specific service
  
  -- Service status tracking
  served_at TIMESTAMP WITH TIME ZONE, -- ADD THIS: When this service was completed
  served_by INTEGER REFERENCES staff(id) ON DELETE SET NULL, -- ADD THIS: Which staff member did it
  
  -- Order/sequence in booking
  sequence_order INTEGER NOT NULL DEFAULT 1, -- ADD THIS: Order of services in booking
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_bookings_booking ON service_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_service ON service_bookings(service_id);

-- 6. VOUCHER TABLE (Enhancement - add expiry and booking link)
-- Current: id, code, value, used_at, created_at
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS used_by_booking_id INTEGER REFERENCES booking(id) ON DELETE SET NULL;
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 1; -- How many times it can be used
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0; -- How many times it's been used

-- ============================================
-- ENUMS (Update existing booking_status enum)
-- ============================================

-- Current enum: booking_status = 'PENDING' | 'PAID' | 'CANCELLED'
-- Should be updated to: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

-- ============================================
-- HELPER VIEWS (Optional but useful)
-- ============================================

-- View: Booking details with customer and service info
CREATE OR REPLACE VIEW booking_details AS
SELECT 
  b.id,
  b.customer_id,
  c.name AS customer_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  b.appointment_date,
  b.appointment_time,
  b.duration_minutes,
  b.location,
  s.name AS staff_name,
  b.status,
  b.grand_total,
  b.grand_discount,
  b.final_total,
  b.notes,
  b.created_at,
  -- Aggregate services as JSON
  json_agg(
    json_build_object(
      'service_id', sv.id,
      'service_title', sv.title,
      'quantity', sb.quantity,
      'price', sb.price_at_booking
    )
  ) AS services
FROM booking b
JOIN customer c ON b.customer_id = c.id
LEFT JOIN staff s ON b.staff_id = s.id
LEFT JOIN service_bookings sb ON b.id = sb.booking_id
LEFT JOIN service sv ON sb.service_id = sv.id
GROUP BY b.id, c.id, s.id;

-- ============================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_updated_at BEFORE UPDATE ON customer
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_updated_at BEFORE UPDATE ON service
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_updated_at BEFORE UPDATE ON booking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate final_total
CREATE OR REPLACE FUNCTION calculate_booking_final_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.final_total = NEW.grand_total - COALESCE(NEW.grand_discount, 0);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_final_total BEFORE INSERT OR UPDATE ON booking
  FOR EACH ROW EXECUTE FUNCTION calculate_booking_final_total();

-- ============================================
-- SUMMARY OF CHANGES NEEDED
-- ============================================

/*
CHANGES TO EXISTING TABLES:
1. booking:
   - ADD: appointment_date, appointment_time, duration_minutes
   - ADD: location, staff_id
   - ADD: final_total, voucher_id, notes
   - ADD: cancellation_reason, cancelled_at
   - ADD: confirmed_at, started_at, completed_at
   - UPDATE: status enum to include CONFIRMED, IN_PROGRESS, COMPLETED, NO_SHOW
   - RENAME: grandTotal -> grand_total (snake_case)

2. service:
   - ADD: description, duration_minutes, category
   - ADD: is_active, image_url, updated_at

3. customer:
   - ADD: phone, address, notes, updated_at

4. service_bookings:
   - ADD: service_id (CRITICAL - currently missing!)
   - ADD: quantity, price_at_booking, discount_amount
   - ADD: sequence_order
   - FIX: booking_transaction_id should be booking_id

5. voucher:
   - ADD: expiry_date, used_by_booking_id
   - ADD: is_active, usage_limit, usage_count

NEW TABLES:
6. staff - For managing staff/employees who provide services

OPTIONAL BUT RECOMMENDED:
- booking_details view for easy querying
- Triggers for auto-updating timestamps
- Triggers for auto-calculating final_total
*/

