-- Add customer_id column to voucher table if it doesn't exist
ALTER TABLE voucher ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer(id) ON DELETE SET NULL;

-- Add constraint to ensure voucher code is exactly 6 characters
ALTER TABLE voucher DROP CONSTRAINT IF EXISTS voucher_code_length_check;
ALTER TABLE voucher ADD CONSTRAINT voucher_code_length_check CHECK (char_length(code) = 6);

-- Add constraint to ensure voucher code starts with 'BF' and is uppercase
ALTER TABLE voucher DROP CONSTRAINT IF EXISTS voucher_code_format_check;
ALTER TABLE voucher ADD CONSTRAINT voucher_code_format_check CHECK (
  code ~ '^BF[A-Z0-9]{4}$' AND code = UPPER(code)
);

-- Create unique constraint on voucher code to prevent duplicates at database level
ALTER TABLE voucher DROP CONSTRAINT IF EXISTS voucher_code_unique;
ALTER TABLE voucher ADD CONSTRAINT voucher_code_unique UNIQUE (code);

-- Create index on voucher code for faster lookups
CREATE INDEX IF NOT EXISTS idx_voucher_code ON voucher(code);

-- Create index on customer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_voucher_customer_id ON voucher(customer_id) WHERE customer_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable Row Level Security on voucher table
ALTER TABLE voucher ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view vouchers (needed for voucher validation during booking)
-- This allows customers to check voucher validity even when not logged in
CREATE POLICY "Anyone can view vouchers"
  ON voucher
  FOR SELECT
  USING (true);

-- Policy: Only owners can create vouchers
CREATE POLICY "Owners can create vouchers"
  ON voucher
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Policy: Only owners can update vouchers
CREATE POLICY "Owners can update vouchers"
  ON voucher
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

-- Policy: Only owners can delete vouchers
CREATE POLICY "Owners can delete vouchers"
  ON voucher
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );

-- Policy: Service role can do everything (for edge functions and admin operations)
CREATE POLICY "Service role can manage all vouchers"
  ON voucher
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

