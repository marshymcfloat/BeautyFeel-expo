-- ============================================
-- Service Set Migration
-- ============================================
-- This migration creates the service_set and service_set_items tables
-- Run this entire file in your Supabase SQL Editor
-- 
-- After running:
-- 1. Regenerate TypeScript types: npm run generate:types
-- 2. The updated database.types.ts will include the new tables
-- ============================================

-- ============================================
-- 1. Create service_set table
-- ============================================
CREATE TABLE IF NOT EXISTS public.service_set (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    branch TEXT NOT NULL CHECK (branch IN ('NAILS', 'SKIN', 'LASHES', 'MASSAGE')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ
);

-- Create indexes for service_set
CREATE INDEX IF NOT EXISTS idx_service_set_branch ON public.service_set(branch);
CREATE INDEX IF NOT EXISTS idx_service_set_is_active ON public.service_set(is_active);

-- ============================================
-- 2. Create service_set_items junction table
-- ============================================
CREATE TABLE IF NOT EXISTS public.service_set_items (
    id BIGSERIAL PRIMARY KEY,
    service_set_id BIGINT NOT NULL REFERENCES public.service_set(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES public.service(id) ON DELETE CASCADE,
    adjusted_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(service_set_id, service_id)
);

-- Create indexes for service_set_items
CREATE INDEX IF NOT EXISTS idx_service_set_items_set_id ON public.service_set_items(service_set_id);
CREATE INDEX IF NOT EXISTS idx_service_set_items_service_id ON public.service_set_items(service_id);

-- ============================================
-- 3. Optional: Add service_set_id to service_bookings table (for tracking)
-- ============================================
-- Uncomment the following lines if you want to track which service set a service booking came from
-- ALTER TABLE public.service_bookings
-- ADD COLUMN IF NOT EXISTS service_set_id BIGINT REFERENCES public.service_set(id) ON DELETE SET NULL;
-- 
-- CREATE INDEX IF NOT EXISTS idx_service_bookings_service_set_id ON public.service_bookings(service_set_id);

-- ============================================
-- 4. Enable Row Level Security (if using RLS)
-- ============================================
-- Uncomment the following section if you're using Row Level Security
-- This includes policies for:
-- - service_set (service sets)
-- - service_set_items (junction table)
-- - service (individual services, referenced by service sets)

-- Service Set policies
-- ALTER TABLE public.service_set ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Service sets are viewable by authenticated users" ON public.service_set;
-- CREATE POLICY "Service sets are viewable by authenticated users"
--     ON public.service_set FOR SELECT
--     USING (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Service sets are insertable by authenticated users" ON public.service_set;
-- CREATE POLICY "Service sets are insertable by authenticated users"
--     ON public.service_set FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Service sets are updatable by authenticated users" ON public.service_set;
-- CREATE POLICY "Service sets are updatable by authenticated users"
--     ON public.service_set FOR UPDATE
--     USING (auth.role() = 'authenticated')
--     WITH CHECK (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Service sets are deletable by authenticated users" ON public.service_set;
-- CREATE POLICY "Service sets are deletable by authenticated users"
--     ON public.service_set FOR DELETE
--     USING (auth.role() = 'authenticated');

-- Service Set Items policies
-- ALTER TABLE public.service_set_items ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Service set items are viewable by authenticated users" ON public.service_set_items;
-- CREATE POLICY "Service set items are viewable by authenticated users"
--     ON public.service_set_items FOR SELECT
--     USING (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Service set items are insertable by authenticated users" ON public.service_set_items;
-- CREATE POLICY "Service set items are insertable by authenticated users"
--     ON public.service_set_items FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Service set items are updatable by authenticated users" ON public.service_set_items;
-- CREATE POLICY "Service set items are updatable by authenticated users"
--     ON public.service_set_items FOR UPDATE
--     USING (auth.role() = 'authenticated')
--     WITH CHECK (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Service set items are deletable by authenticated users" ON public.service_set_items;
-- CREATE POLICY "Service set items are deletable by authenticated users"
--     ON public.service_set_items FOR DELETE
--     USING (auth.role() = 'authenticated');

-- Service table policies (relevant for service sets)
-- ALTER TABLE public.service ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Services are viewable by authenticated users" ON public.service;
-- CREATE POLICY "Services are viewable by authenticated users"
--     ON public.service FOR SELECT
--     USING (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Services are insertable by authenticated users" ON public.service;
-- CREATE POLICY "Services are insertable by authenticated users"
--     ON public.service FOR INSERT
--     WITH CHECK (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Services are updatable by authenticated users" ON public.service;
-- CREATE POLICY "Services are updatable by authenticated users"
--     ON public.service FOR UPDATE
--     USING (auth.role() = 'authenticated')
--     WITH CHECK (auth.role() = 'authenticated');
-- 
-- DROP POLICY IF EXISTS "Services are deletable by authenticated users" ON public.service;
-- CREATE POLICY "Services are deletable by authenticated users"
--     ON public.service FOR DELETE
--     USING (auth.role() = 'authenticated');

-- ============================================
-- Migration Complete!
-- ============================================
-- Next steps:
-- 1. Run: npm run generate:types
-- 2. The updated database.types.ts will include the new tables
-- 3. You can now create service sets in the Manage tab
