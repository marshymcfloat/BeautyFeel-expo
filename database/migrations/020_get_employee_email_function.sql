-- Migration: Create function to get employee email by user_id
-- This function retrieves the email from auth.users for a given employee user_id

CREATE OR REPLACE FUNCTION get_employee_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_email, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_employee_email(UUID) IS 'Gets the email address for an employee from auth.users table';

