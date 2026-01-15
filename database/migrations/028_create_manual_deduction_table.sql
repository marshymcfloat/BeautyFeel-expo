-- Migration: Create manual_deduction table
-- Description: Stores manual deductions like utilities, electricity, and other bills
-- Each deduction is branch-specific

-- Create the manual_deduction table
CREATE TABLE IF NOT EXISTS manual_deduction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch branch NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    deduction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by branch and date
CREATE INDEX IF NOT EXISTS idx_manual_deduction_branch_date 
    ON manual_deduction(branch, deduction_date DESC);

-- Create index for created_by for user queries
CREATE INDEX IF NOT EXISTS idx_manual_deduction_created_by 
    ON manual_deduction(created_by);

-- Enable RLS
ALTER TABLE manual_deduction ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Owners can view deductions for their branches" ON manual_deduction;
DROP POLICY IF EXISTS "Owners can insert deductions for their branches" ON manual_deduction;
DROP POLICY IF EXISTS "Owners can update deductions for their branches" ON manual_deduction;
DROP POLICY IF EXISTS "Owners can delete deductions for their branches" ON manual_deduction;

-- Owners can view/manage deductions for their branches
CREATE POLICY "Owners can view deductions for their branches"
    ON manual_deduction
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employee
            WHERE employee.user_id = auth.uid()
            AND employee.role = 'OWNER'
            AND (
                -- SKIN owner can see NAILS, SKIN, MASSAGE
                (employee.branch = 'SKIN' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- LASHES owner can only see LASHES
                OR (employee.branch = 'LASHES' AND manual_deduction.branch = 'LASHES')
                -- NAILS owner can see NAILS, SKIN, MASSAGE
                OR (employee.branch = 'NAILS' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- MASSAGE owner can see NAILS, SKIN, MASSAGE
                OR (employee.branch = 'MASSAGE' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
            )
        )
    );

CREATE POLICY "Owners can insert deductions for their branches"
    ON manual_deduction
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM employee
            WHERE employee.user_id = auth.uid()
            AND employee.role = 'OWNER'
            AND (
                -- SKIN owner can insert for NAILS, SKIN, MASSAGE
                (employee.branch = 'SKIN' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- LASHES owner can only insert for LASHES
                OR (employee.branch = 'LASHES' AND manual_deduction.branch = 'LASHES')
                -- NAILS owner can insert for NAILS, SKIN, MASSAGE
                OR (employee.branch = 'NAILS' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- MASSAGE owner can insert for NAILS, SKIN, MASSAGE
                OR (employee.branch = 'MASSAGE' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
            )
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Owners can update deductions for their branches"
    ON manual_deduction
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM employee
            WHERE employee.user_id = auth.uid()
            AND employee.role = 'OWNER'
            AND (
                -- SKIN owner can update for NAILS, SKIN, MASSAGE
                (employee.branch = 'SKIN' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- LASHES owner can only update for LASHES
                OR (employee.branch = 'LASHES' AND manual_deduction.branch = 'LASHES')
                -- NAILS owner can update for NAILS, SKIN, MASSAGE
                OR (employee.branch = 'NAILS' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- MASSAGE owner can update for NAILS, SKIN, MASSAGE
                OR (employee.branch = 'MASSAGE' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
            )
        )
    );

CREATE POLICY "Owners can delete deductions for their branches"
    ON manual_deduction
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM employee
            WHERE employee.user_id = auth.uid()
            AND employee.role = 'OWNER'
            AND (
                -- SKIN owner can delete for NAILS, SKIN, MASSAGE
                (employee.branch = 'SKIN' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- LASHES owner can only delete for LASHES
                OR (employee.branch = 'LASHES' AND manual_deduction.branch = 'LASHES')
                -- NAILS owner can delete for NAILS, SKIN, MASSAGE
                OR (employee.branch = 'NAILS' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
                -- MASSAGE owner can delete for NAILS, SKIN, MASSAGE
                OR (employee.branch = 'MASSAGE' AND manual_deduction.branch IN ('NAILS', 'SKIN', 'MASSAGE'))
            )
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_deduction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_manual_deduction_updated_at ON manual_deduction;

CREATE TRIGGER trigger_update_manual_deduction_updated_at
    BEFORE UPDATE ON manual_deduction
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_deduction_updated_at();

COMMENT ON TABLE manual_deduction IS 'Stores manual deductions like utilities, electricity, and other bills. Branch-specific.';
COMMENT ON COLUMN manual_deduction.branch IS 'Branch this deduction belongs to';
COMMENT ON COLUMN manual_deduction.amount IS 'Deduction amount in pesos';
COMMENT ON COLUMN manual_deduction.description IS 'Description of the deduction (e.g., "Electricity", "Water", "Internet")';
COMMENT ON COLUMN manual_deduction.deduction_date IS 'Date when the deduction occurred';
