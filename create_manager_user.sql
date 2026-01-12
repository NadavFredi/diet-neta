-- =====================================================
-- Create Manager User with Admin Role
-- =====================================================
-- Email: manager@dietneta.com
-- Password: Manager123!
-- Role: admin
-- =====================================================
-- Run this script in Supabase SQL Editor (Production)
-- =====================================================

DO $$
DECLARE
  v_manager_user_id UUID;
  v_user_exists BOOLEAN := FALSE;
BEGIN
  -- Check if manager user already exists
  SELECT id INTO v_manager_user_id
  FROM auth.users
  WHERE email = 'manager@dietneta.com'
  LIMIT 1;
  
  IF v_manager_user_id IS NOT NULL THEN
    v_user_exists := TRUE;
    RAISE NOTICE 'Manager user already exists with ID: %', v_manager_user_id;
  END IF;
  
  -- Create auth user if it doesn't exist
  IF NOT v_user_exists THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'manager@dietneta.com',
      crypt('Manager123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "מנהל מערכת", "role": "admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_manager_user_id;
    
    RAISE NOTICE '✅ Manager user created: manager@dietneta.com (ID: %)', v_manager_user_id;
  ELSE
    -- Update password if user exists (optional - uncomment if you want to reset password)
    -- UPDATE auth.users
    -- SET encrypted_password = crypt('Manager123!', gen_salt('bf')),
    --     updated_at = NOW()
    -- WHERE id = v_manager_user_id;
    -- RAISE NOTICE '✅ Manager password updated: manager@dietneta.com';
  END IF;
  
  -- Create or update profile with admin role
  IF v_manager_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_manager_user_id, 'manager@dietneta.com', 'מנהל מערכת', 'admin')
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin',
          email = 'manager@dietneta.com',
          full_name = 'מנהל מערכת',
          updated_at = NOW();
    
    RAISE NOTICE '✅ Manager profile created/updated with admin role: manager@dietneta.com';
  END IF;
  
  -- Final confirmation
  IF v_manager_user_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Manager User Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Email: manager@dietneta.com';
    RAISE NOTICE 'Password: Manager123!';
    RAISE NOTICE 'Role: admin';
    RAISE NOTICE 'User ID: %', v_manager_user_id;
    RAISE NOTICE '========================================';
  ELSE
    RAISE EXCEPTION 'Failed to create manager user';
  END IF;
END $$;
