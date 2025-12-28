-- Migration: Fix Manager User Password
-- Created: 2024-01-02
-- Description: Properly creates/resets manager user password using Supabase Auth

-- This migration uses a function to properly set the password
-- Note: Direct password updates in auth.users don't work with Supabase Auth
-- This migration will be handled by a script instead

-- For now, we'll just ensure the profile is correct
-- The password should be reset using the admin API or script

DO $$
DECLARE
  v_manager_user_id UUID;
BEGIN
  -- Find manager user
  SELECT id INTO v_manager_user_id
  FROM auth.users
  WHERE email = 'manager@dietneta.com'
  LIMIT 1;
  
  -- Ensure profile exists and is correct
  IF v_manager_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_manager_user_id, 'manager@dietneta.com', 'מנהל מערכת', 'admin')
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin',
          email = 'manager@dietneta.com',
          full_name = 'מנהל מערכת';
    
    RAISE NOTICE '✅ Manager profile updated: manager@dietneta.com (ID: %)', v_manager_user_id;
    RAISE NOTICE '⚠️  Password reset required. Run: node scripts/reset_manager_password.js';
  ELSE
    RAISE NOTICE '⚠️  Manager user not found. Please create using Supabase Auth signUp or admin API.';
  END IF;
END $$;
