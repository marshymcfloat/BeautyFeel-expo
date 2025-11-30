-- ============================================
-- RPC Functions for Employee Auth User Management
-- ============================================
-- These functions allow creating and updating auth users for employees
-- They require SECURITY DEFINER to access auth.users table
-- 
-- IMPORTANT: This approach directly manipulates auth.users which is not recommended.
-- For production, consider using Supabase Edge Functions with Admin API instead.
-- See EMPLOYEE_MANAGEMENT_SETUP.md for the recommended approach.
-- ============================================

-- IMPORTANT: Before running this migration, you MUST enable the pgcrypto extension
-- Run this command in Supabase SQL Editor FIRST:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- Or enable it via Supabase Dashboard:
-- Dashboard > Database > Extensions > Enable "pgcrypto"
--
-- Without pgcrypto, the gen_salt() function will not work.

-- Enable pgcrypto extension for password hashing (if you have permission)
-- If this fails, enable it manually via Supabase Dashboard
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pgcrypto extension cannot be enabled. Please enable it manually in Supabase Dashboard (Database > Extensions).';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error enabling pgcrypto: %. Please enable it manually.', SQLERRM;
END
$$;

-- Function to create an auth user for an employee
CREATE OR REPLACE FUNCTION public.create_employee_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_user_record JSON;
BEGIN
  -- Create the auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    jsonb_build_object('name', p_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Create the user identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::TEXT, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Return the user ID
  RETURN json_build_object('user_id', v_user_id::TEXT);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating user: %', SQLERRM;
END;
$$;

-- Function to update an auth user for an employee
CREATE OR REPLACE FUNCTION public.update_employee_user(
  p_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_uuid UUID;
  v_updated_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Convert user_id to UUID
  v_user_uuid := p_user_id::UUID;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_uuid) THEN
    RAISE EXCEPTION 'User with ID % not found', p_user_id;
  END IF;

  -- Update email if provided
  IF p_email IS NOT NULL AND p_email != '' THEN
    UPDATE auth.users
    SET email = p_email,
        updated_at = NOW()
    WHERE id = v_user_uuid;
    
    -- Update identity email as well
    UPDATE auth.identities
    SET identity_data = jsonb_set(
      identity_data,
      '{email}',
      to_jsonb(p_email)
    ),
    updated_at = NOW()
    WHERE user_id = v_user_uuid;
    
    v_updated_fields := array_append(v_updated_fields, 'email');
  END IF;

  -- Update password if provided
  IF p_password IS NOT NULL AND p_password != '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_user_uuid;
    
    v_updated_fields := array_append(v_updated_fields, 'password');
  END IF;

  -- Return success message
  RETURN json_build_object(
    'success', true,
    'updated_fields', v_updated_fields
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating user: %', SQLERRM;
END;
$$;

-- Grant execute permissions to authenticated users (or adjust based on your RLS policies)
-- Note: You may want to restrict this to owners only via RLS or application logic
GRANT EXECUTE ON FUNCTION public.create_employee_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employee_user TO authenticated;

-- ============================================
-- Migration Complete!
-- ============================================
-- After running this:
-- 1. The RPC functions will be created in your Supabase database
-- 2. You can call them from your application to create/update auth users
-- 3. These functions use SECURITY DEFINER to access auth.users table
-- 4. Make sure to set up appropriate RLS policies if needed
-- ============================================
