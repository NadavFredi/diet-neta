-- Migration: Create Test Users (Manager & Client)
-- Created: 2024-01-02
-- Description: Creates two test users:
--   1. Manager user (coach/admin) - sees full dashboard
--   2. Client user (trainee) - sees only their client portal
-- IMPORTANT: This must be the LAST migration to run

-- =====================================================
-- CREATE TEST USERS
-- =====================================================

DO $$
DECLARE
  v_manager_user_id UUID;
  v_client_user_id UUID;
  v_client_customer_id UUID;
  v_client_lead_id UUID;
BEGIN
  -- =====================================================
  -- 1. CREATE MANAGER USER (coach/admin)
  -- =====================================================
  
  -- Check if manager user already exists
  SELECT id INTO v_manager_user_id
  FROM auth.users
  WHERE email = 'manager@dietneta.com';
  
  -- Create auth user for manager (only if doesn't exist)
  IF v_manager_user_id IS NULL THEN
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
  END IF;
  
  -- Create profile for manager (if user exists)
  IF v_manager_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_manager_user_id, 'manager@dietneta.com', 'מנהל מערכת', 'admin')
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin',
          email = 'manager@dietneta.com',
          full_name = 'מנהל מערכת';
    
    RAISE NOTICE '✅ Manager user created/updated: manager@dietneta.com (ID: %)', v_manager_user_id;
  ELSE
    -- User already exists, get the ID
    SELECT id INTO v_manager_user_id
    FROM auth.users
    WHERE email = 'manager@dietneta.com';
    
    -- Update profile to ensure correct role
    UPDATE public.profiles
    SET role = 'admin',
        email = 'manager@dietneta.com',
        full_name = 'מנהל מערכת'
    WHERE id = v_manager_user_id;
    
    RAISE NOTICE '✅ Manager user already exists, profile updated: manager@dietneta.com (ID: %)', v_manager_user_id;
  END IF;
  
  -- =====================================================
  -- 2. CREATE CLIENT USER (trainee)
  -- =====================================================
  
  -- Check if client user already exists
  SELECT id INTO v_client_user_id
  FROM auth.users
  WHERE email = 'client@dietneta.com';
  
  -- Create auth user for client (only if doesn't exist)
  IF v_client_user_id IS NULL THEN
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
      'client@dietneta.com',
      crypt('Client123!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "לקוח בדיקה", "role": "trainee"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_client_user_id;
  END IF;
  
  -- Create profile for client (if user exists)
  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_client_user_id, 'client@dietneta.com', 'לקוח בדיקה', 'trainee')
    ON CONFLICT (id) DO UPDATE
      SET role = 'trainee',
          email = 'client@dietneta.com',
          full_name = 'לקוח בדיקה';
    
    RAISE NOTICE '✅ Client user created/updated: client@dietneta.com (ID: %)', v_client_user_id;
  ELSE
    -- User already exists, get the ID
    SELECT id INTO v_client_user_id
    FROM auth.users
    WHERE email = 'client@dietneta.com';
    
    -- Update profile to ensure correct role
    UPDATE public.profiles
    SET role = 'trainee',
        email = 'client@dietneta.com',
        full_name = 'לקוח בדיקה'
    WHERE id = v_client_user_id;
    
    RAISE NOTICE '✅ Client user already exists, profile updated: client@dietneta.com (ID: %)', v_client_user_id;
  END IF;
  
  -- =====================================================
  -- 3. CREATE CUSTOMER RECORD FOR CLIENT
  -- =====================================================
  
  IF v_client_user_id IS NOT NULL THEN
    -- Create customer record linked to client user
    -- Use upsert approach since we can't rely on ON CONFLICT with partial unique index
    INSERT INTO customers (full_name, phone, email, user_id)
    VALUES (
      'לקוח בדיקה',
      '0501234567',
      'client@dietneta.com',
      v_client_user_id
    )
    ON CONFLICT (phone) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email
    RETURNING id INTO v_client_customer_id;
    
    -- If customer already existed with different user_id, update it
    IF v_client_customer_id IS NULL THEN
      UPDATE customers
      SET user_id = v_client_user_id,
          full_name = 'לקוח בדיקה',
          email = 'client@dietneta.com'
      WHERE phone = '0501234567'
      RETURNING id INTO v_client_customer_id;
    END IF;
    
    RAISE NOTICE '✅ Customer record created/updated for client (ID: %)', v_client_customer_id;
    
    -- =====================================================
    -- 4. CREATE LEAD RECORD FOR CLIENT
    -- =====================================================
    
    -- Create a lead record for the client (only if doesn't exist)
    -- Note: After normalization, leads table no longer has full_name, phone, email columns
    -- Those are in the customers table, linked via customer_id
    INSERT INTO leads (
      customer_id,
      status_main,
      fitness_goal,
      height,
      weight,
      activity_level
    )
    SELECT 
      v_client_customer_id,
      'בטיפול',
      'ירידה במשקל',
      175.0,
      75.0,
      'בינוני'
    WHERE NOT EXISTS (
      SELECT 1 FROM leads 
      WHERE customer_id = v_client_customer_id
    )
    RETURNING id INTO v_client_lead_id;
    
    RAISE NOTICE '✅ Lead record created/updated for client (ID: %)', v_client_lead_id;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TEST USERS CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📧 MANAGER USER:';
  RAISE NOTICE '   Email: manager@dietneta.com';
  RAISE NOTICE '   Password: Manager123!';
  RAISE NOTICE '   Role: admin (sees full dashboard)';
  RAISE NOTICE '';
  RAISE NOTICE '📧 CLIENT USER:';
  RAISE NOTICE '   Email: client@dietneta.com';
  RAISE NOTICE '   Password: Client123!';
  RAISE NOTICE '   Role: trainee (sees only client portal)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating test users: %', SQLERRM;
    -- Don't fail the migration if users already exist
END $$;

