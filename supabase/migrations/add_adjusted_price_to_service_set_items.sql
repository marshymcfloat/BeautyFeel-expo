-- ============================================
-- Add adjusted_price column to service_set_items
-- ============================================
-- This migration adds the adjusted_price column to the existing service_set_items table
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add adjusted_price column to service_set_items table (if it doesn't exist)
ALTER TABLE IF EXISTS public.service_set_items
ADD COLUMN IF NOT EXISTS adjusted_price DECIMAL(10, 2);

-- Add a comment to document the column
COMMENT ON COLUMN public.service_set_items.adjusted_price IS 
  'Optional adjusted price for commission calculation. If NULL, uses the original service price or divides the service set price evenly.';

-- ============================================
-- Migration Complete!
-- ============================================
-- After running this:
-- 1. The adjusted_price column will be added to service_set_items
-- 2. Existing rows will have NULL for adjusted_price (which means use original price)
-- 3. You may need to refresh your app to see the changes
-- ============================================
