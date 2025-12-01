-- Create gift certificate status enum type
DO $$ BEGIN
  CREATE TYPE gift_certificate_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create gift_certificate table
CREATE TABLE IF NOT EXISTS gift_certificate (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customer(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  expires_on DATE,
  status gift_certificate_status DEFAULT 'ACTIVE'::gift_certificate_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create junction table for gift certificate services
CREATE TABLE IF NOT EXISTS gift_certificate_services (
  id SERIAL PRIMARY KEY,
  gift_certificate_id INTEGER NOT NULL REFERENCES gift_certificate(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(gift_certificate_id, service_id)
);

-- Create junction table for gift certificate service sets
CREATE TABLE IF NOT EXISTS gift_certificate_service_sets (
  id SERIAL PRIMARY KEY,
  gift_certificate_id INTEGER NOT NULL REFERENCES gift_certificate(id) ON DELETE CASCADE,
  service_set_id INTEGER NOT NULL REFERENCES service_set(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(gift_certificate_id, service_set_id)
);

-- Add constraint to ensure gift certificate code is exactly 6 characters, starts with GC, and is uppercase alphanumeric
ALTER TABLE gift_certificate ADD CONSTRAINT gift_certificate_code_length_check 
  CHECK (char_length(code) = 6);
ALTER TABLE gift_certificate ADD CONSTRAINT gift_certificate_code_format_check 
  CHECK (code = UPPER(code) AND code ~ '^GC[A-Z0-9]{4}$');

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gift_certificate_code ON gift_certificate(code);
CREATE INDEX IF NOT EXISTS idx_gift_certificate_customer_id ON gift_certificate(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gift_certificate_status ON gift_certificate(status);
CREATE INDEX IF NOT EXISTS idx_gift_certificate_expires_on ON gift_certificate(expires_on) WHERE expires_on IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gift_certificate_services_gift_certificate_id ON gift_certificate_services(gift_certificate_id);
CREATE INDEX IF NOT EXISTS idx_gift_certificate_services_service_id ON gift_certificate_services(service_id);
CREATE INDEX IF NOT EXISTS idx_gift_certificate_service_sets_gift_certificate_id ON gift_certificate_service_sets(gift_certificate_id);
CREATE INDEX IF NOT EXISTS idx_gift_certificate_service_sets_service_set_id ON gift_certificate_service_sets(service_set_id);

-- Create function to automatically update status to EXPIRED
CREATE OR REPLACE FUNCTION update_expired_gift_certificates()
RETURNS void AS $$
BEGIN
  UPDATE gift_certificate
  SET status = 'EXPIRED'::gift_certificate_status
  WHERE expires_on IS NOT NULL
    AND expires_on < CURRENT_DATE
    AND status = 'ACTIVE'::gift_certificate_status;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gift_certificate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gift_certificate_updated_at
  BEFORE UPDATE ON gift_certificate
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_certificate_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable Row Level Security on gift_certificate table
ALTER TABLE gift_certificate ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view gift certificates (needed for validation)
CREATE POLICY "Anyone can view gift certificates"
  ON gift_certificate
  FOR SELECT
  USING (true);

-- Policy: Only owners can create gift certificates
CREATE POLICY "Owners can create gift certificates"
  ON gift_certificate
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Policy: Only owners can update gift certificates
CREATE POLICY "Owners can update gift certificates"
  ON gift_certificate
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Policy: Only owners can delete gift certificates
CREATE POLICY "Owners can delete gift certificates"
  ON gift_certificate
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Policy: Service role can do everything (for edge functions and admin operations)
CREATE POLICY "Service role can manage all gift certificates"
  ON gift_certificate
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on junction tables
ALTER TABLE gift_certificate_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_certificate_service_sets ENABLE ROW LEVEL SECURITY;

-- Policies for gift_certificate_services
CREATE POLICY "Anyone can view gift certificate services"
  ON gift_certificate_services
  FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage gift certificate services"
  ON gift_certificate_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Policies for gift_certificate_service_sets
CREATE POLICY "Anyone can view gift certificate service sets"
  ON gift_certificate_service_sets
  FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage gift certificate service sets"
  ON gift_certificate_service_sets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
    OR auth.jwt() ->> 'role' = 'service_role'
  );

