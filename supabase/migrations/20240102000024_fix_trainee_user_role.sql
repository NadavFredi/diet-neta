-- Migration: Fix Trainee User Role
-- Created: 2024-01-02
-- Description: 
--   1. Update existing trainee user's role from 'user' to 'trainee' in the profiles table
--   2. Create profile with correct role if user exists in auth.users but not in profiles
--   3. Update handle_new_user function to automatically set role='trainee' for trainee@test.com

-- =====================================================
-- 1. UPDATE handle_new_user to auto-set trainee role
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set role to 'trainee' for trainee@test.com
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        CASE 
            WHEN NEW.email = 'trainee@test.com' THEN 'trainee'
            ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user')
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. UPDATE/CREATE trainee@test.com role to 'trainee'
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_updated_count INTEGER;
BEGIN
  -- Find the user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'trainee@test.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️ User trainee@test.com not found in auth.users - will be set to trainee when user is created';
    RETURN;
  END IF;
  
  -- Check if profile exists
  SELECT role INTO v_role
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_role IS NULL THEN
    -- Profile doesn't exist, create it with 'trainee' role
    INSERT INTO profiles (id, email, role, full_name)
    VALUES (v_user_id, 'trainee@test.com', 'trainee', 'Test Trainee')
    ON CONFLICT (id) DO UPDATE
      SET role = 'trainee',
          email = EXCLUDED.email;
    
    RAISE NOTICE '✅ Created profile for trainee@test.com with role: trainee';
  ELSIF v_role != 'trainee' THEN
    -- Profile exists but has wrong role, update it
    UPDATE profiles 
    SET role = 'trainee' 
    WHERE id = v_user_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
      RAISE NOTICE '✅ Updated trainee@test.com role from % to: trainee', v_role;
    END IF;
  ELSE
    -- Profile already has correct role
    RAISE NOTICE '✅ User trainee@test.com already has role: trainee';
  END IF;
END $$;

