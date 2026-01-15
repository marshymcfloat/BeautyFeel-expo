-- Migration: Add branch column to employee table
-- This allows employees to be associated with specific branches (NAILS, SKIN, LASHES, MASSAGE)

-- Add branch column to employee table (nullable to allow existing employees)
ALTER TABLE employee
ADD COLUMN branch branch;

-- Add comment to the column
COMMENT ON COLUMN employee.branch IS 'Branch location for the employee (NAILS, SKIN, LASHES, MASSAGE)';

-- Note: Existing employees will have NULL branch values
-- You may want to update existing employees manually or set a default value
-- Example: UPDATE employee SET branch = 'NAILS' WHERE branch IS NULL;

