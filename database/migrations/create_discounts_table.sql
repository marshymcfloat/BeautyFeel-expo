-- MIGRATION: Create Discounts Table
-- This migration creates the discount system for temporary service price discounts
-- Only one active discount can exist at a time

-- 1. CREATE DISCOUNT TYPE ENUM (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
        CREATE TYPE discount_type AS ENUM ('ABSOLUTE', 'PERCENTAGE');
    END IF;
END $$;

-- 2. CREATE DISCOUNT STATUS ENUM (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_status') THEN
        CREATE TYPE discount_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
    END IF;
END $$;

-- 3. CREATE DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.discount (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
    branch branch, -- NULL means applies to all branches
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status discount_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT, -- User ID who created the discount
    
    -- Ensure end_date is after start_date
    CONSTRAINT discount_dates_check CHECK (end_date > start_date),
    
    -- Ensure discount_value is valid based on type
    CONSTRAINT discount_percentage_check CHECK (
        (discount_type = 'PERCENTAGE' AND discount_value <= 100) OR
        (discount_type = 'ABSOLUTE')
    )
);

-- 4. CREATE DISCOUNT_SERVICES JUNCTION TABLE (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.discount_services (
    id SERIAL PRIMARY KEY,
    discount_id INTEGER NOT NULL REFERENCES public.discount(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES public.service(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure one service can only be in a discount once
    UNIQUE(discount_id, service_id)
);

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_discount_status ON public.discount(status);
CREATE INDEX IF NOT EXISTS idx_discount_dates ON public.discount(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_discount_branch ON public.discount(branch);
CREATE INDEX IF NOT EXISTS idx_discount_services_discount_id ON public.discount_services(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_services_service_id ON public.discount_services(service_id);

-- 6. CREATE FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_discount_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE TRIGGER FOR UPDATED_AT
DROP TRIGGER IF EXISTS trigger_update_discount_updated_at ON public.discount;
CREATE TRIGGER trigger_update_discount_updated_at
    BEFORE UPDATE ON public.discount
    FOR EACH ROW
    EXECUTE FUNCTION update_discount_updated_at();

-- 8. CREATE FUNCTION TO AUTO-EXPIRE DISCOUNTS
CREATE OR REPLACE FUNCTION expire_discounts()
RETURNS void AS $$
BEGIN
    UPDATE public.discount
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE'
    AND end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE FUNCTION TO ENSURE ONLY ONE ACTIVE DISCOUNT AT A TIME
CREATE OR REPLACE FUNCTION check_single_active_discount()
RETURNS TRIGGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Only check if the new/updated discount is ACTIVE
    IF NEW.status = 'ACTIVE' THEN
        -- Count other active discounts (excluding current one if updating)
        SELECT COUNT(*) INTO active_count
        FROM public.discount
        WHERE status = 'ACTIVE'
        AND id != COALESCE(NEW.id, 0)
        AND (
            -- Check for overlapping date ranges
            (start_date <= NEW.end_date AND end_date >= NEW.start_date)
        );
        
        IF active_count > 0 THEN
            RAISE EXCEPTION 'Only one active discount can exist at a time. Please deactivate or expire existing discounts first.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE TRIGGER TO ENFORCE SINGLE ACTIVE DISCOUNT
DROP TRIGGER IF EXISTS trigger_check_single_active_discount ON public.discount;
CREATE TRIGGER trigger_check_single_active_discount
    BEFORE INSERT OR UPDATE ON public.discount
    FOR EACH ROW
    EXECUTE FUNCTION check_single_active_discount();

-- 11. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.discount ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_services ENABLE ROW LEVEL SECURITY;

-- 12. CREATE POLICIES FOR DISCOUNT TABLE

-- Policy: Allow authenticated users to view active discounts
DROP POLICY IF EXISTS "Discounts are viewable by authenticated users" ON public.discount;
CREATE POLICY "Discounts are viewable by authenticated users"
    ON public.discount
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only owners can insert discounts
DROP POLICY IF EXISTS "Only owners can create discounts" ON public.discount;
CREATE POLICY "Only owners can create discounts"
    ON public.discount
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employee e
            WHERE e.user_id = auth.uid()
            AND e.role = 'OWNER'::employee_role
        )
    );

-- Policy: Only owners can update discounts
DROP POLICY IF EXISTS "Only owners can update discounts" ON public.discount;
CREATE POLICY "Only owners can update discounts"
    ON public.discount
    FOR UPDATE
    TO authenticated
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

-- Policy: Only owners can delete discounts
DROP POLICY IF EXISTS "Only owners can delete discounts" ON public.discount;
CREATE POLICY "Only owners can delete discounts"
    ON public.discount
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employee e
            WHERE e.user_id = auth.uid()
            AND e.role = 'OWNER'::employee_role
        )
    );

-- 13. CREATE POLICIES FOR DISCOUNT_SERVICES TABLE

-- Policy: Allow authenticated users to view discount services
DROP POLICY IF EXISTS "Discount services are viewable by authenticated users" ON public.discount_services;
CREATE POLICY "Discount services are viewable by authenticated users"
    ON public.discount_services
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only owners can insert discount services
DROP POLICY IF EXISTS "Only owners can create discount services" ON public.discount_services;
CREATE POLICY "Only owners can create discount services"
    ON public.discount_services
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employee e
            WHERE e.user_id = auth.uid()
            AND e.role = 'OWNER'::employee_role
        )
    );

-- Policy: Only owners can update discount services
DROP POLICY IF EXISTS "Only owners can update discount services" ON public.discount_services;
CREATE POLICY "Only owners can update discount services"
    ON public.discount_services
    FOR UPDATE
    TO authenticated
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

-- Policy: Only owners can delete discount services
DROP POLICY IF EXISTS "Only owners can delete discount services" ON public.discount_services;
CREATE POLICY "Only owners can delete discount services"
    ON public.discount_services
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employee e
            WHERE e.user_id = auth.uid()
            AND e.role = 'OWNER'::employee_role
        )
    );

-- 14. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE public.discount IS 'Stores temporary discounts for services. Only one active discount can exist at a time.';
COMMENT ON COLUMN public.discount.discount_type IS 'Type of discount: ABSOLUTE (fixed amount) or PERCENTAGE (percentage off)';
COMMENT ON COLUMN public.discount.discount_value IS 'Discount value. For PERCENTAGE: 0-100, for ABSOLUTE: any positive number';
COMMENT ON COLUMN public.discount.branch IS 'Branch filter. NULL means applies to all branches';
COMMENT ON TABLE public.discount_services IS 'Junction table linking discounts to specific services';

-- 15. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.discount TO authenticated;
GRANT ALL ON public.discount_services TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE discount_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE discount_services_id_seq TO authenticated;

