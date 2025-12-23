-- Quick Setup Script for Trainee User
-- Run this in Supabase SQL Editor after creating a user via Dashboard

-- INSTRUCTIONS:
-- 1. Go to Supabase Studio: http://localhost:54323
-- 2. Go to Authentication → Users → Add User
-- 3. Create user with:
--    - Email: trainee@test.com
--    - Password: test123456
--    - Auto Confirm: ✅
-- 4. Copy the User ID (UUID)
-- 5. Replace 'YOUR_USER_ID_HERE' below with that UUID
-- 6. Run this script

DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE';  -- ⚠️ REPLACE THIS!
  v_customer_id UUID;
  v_lead_id UUID;
BEGIN
  -- Step 1: Update profile role to 'trainee'
  UPDATE profiles 
  SET role = 'trainee' 
  WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in profiles table. Make sure the user was created via Supabase Auth.';
  END IF;
  
  -- Step 2: Create customer and link to user
  INSERT INTO customers (full_name, phone, email, user_id)
  VALUES ('Test Trainee', '0501234567', 'trainee@test.com', v_user_id)
  ON CONFLICT (user_id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email
  RETURNING id INTO v_customer_id;
  
  -- Step 3: Create a lead for the customer
  INSERT INTO leads (
    customer_id,
    full_name,
    status_main,
    fitness_goal,
    height,
    weight,
    activity_level
  )
  VALUES (
    v_customer_id,
    'Test Trainee',
    'בטיפול',
    'ירידה במשקל',
    175,  -- height in cm
    80,   -- weight in kg
    'בינוני'
  )
  RETURNING id INTO v_lead_id;
  
  RAISE NOTICE '✅ Setup Complete!';
  RAISE NOTICE 'Customer ID: %', v_customer_id;
  RAISE NOTICE 'Lead ID: %', v_lead_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Login credentials:';
  RAISE NOTICE 'Email: trainee@test.com';
  RAISE NOTICE 'Password: test123456';
END $$;

-- Verify the setup
SELECT 
  p.id as user_id,
  p.email,
  p.role,
  c.id as customer_id,
  c.full_name as customer_name,
  COUNT(l.id) as lead_count
FROM profiles p
LEFT JOIN customers c ON c.user_id = p.id
LEFT JOIN leads l ON l.customer_id = c.id
WHERE p.email = 'trainee@test.com'
GROUP BY p.id, p.email, p.role, c.id, c.full_name;

