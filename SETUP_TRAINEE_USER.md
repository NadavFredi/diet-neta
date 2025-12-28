# How to Set Up and Login as a Trainee User

## Overview
To login as a trainee and see the client dashboard, you need to:
1. Create a user account in Supabase Auth
2. Set the user's role to 'trainee' in the profiles table
3. Link the user to an existing customer record (or create a new customer)

## Method 1: Using the Registration Page (Easiest)

1. Go to `/register` in your app
2. Fill in:
   - Email: `trainee@example.com` (or any email)
   - Password: `password123` (minimum 6 characters)
   - Confirm Password: `password123`
3. Click "Register"
4. **Important**: After registration, you need to:
   - Link the new user to a customer record (see SQL below)
   - If email confirmation is enabled, confirm the email first

## Method 2: Manual Setup via SQL (Recommended for Testing)

### Step 1: Create a User Account via Supabase Dashboard
1. Open Supabase Studio: `http://localhost:54323`
2. Go to Authentication → Users
3. Click "Add User" → "Create new user"
4. Enter:
   - Email: `trainee@test.com`
   - Password: `test123456`
   - Auto Confirm User: ✅ (check this to skip email confirmation)
5. Click "Create User"
6. **Copy the User ID** (UUID) - you'll need it for the next steps

### Step 2: Update Profile Role to 'trainee'

Run this SQL in Supabase SQL Editor (replace `USER_ID_HERE` with the actual user ID):

```sql
-- Update the profile role to 'trainee'
UPDATE profiles
SET role = 'trainee'
WHERE id = 'USER_ID_HERE';
```

### Step 3: Link User to a Customer

**Option A: Link to Existing Customer (e.g., "אנדריי שצוקין")**

```sql
-- Find the customer ID first
SELECT id, full_name, phone, email 
FROM customers 
WHERE full_name LIKE '%אנדריי%' OR full_name LIKE '%Andrey%';

-- Then link the user (replace CUSTOMER_ID and USER_ID)
UPDATE customers
SET user_id = 'USER_ID_HERE'
WHERE id = 'CUSTOMER_ID_HERE';
```

**Option B: Create New Customer and Link**

```sql
-- Create a new customer
INSERT INTO customers (full_name, phone, email, user_id)
VALUES (
  'Test Trainee',
  '0501234567',
  'trainee@test.com',
  'USER_ID_HERE'  -- The user ID from Step 1
)
RETURNING id;
```

### Step 4: Create a Lead for the Customer (Optional but Recommended)

```sql
-- Get the customer_id from the previous step, then:
INSERT INTO leads (
  customer_id,
  full_name,
  status_main,
  fitness_goal,
  height,
  weight
)
VALUES (
  'CUSTOMER_ID_HERE',
  'Test Trainee',
  'בטיפול',
  'ירידה במשקל',
  175,  -- height in cm
  80    -- weight in kg
)
RETURNING id;
```

## Login Credentials

After setup, you can login with:
- **Email**: `trainee@test.com` (or whatever email you used)
- **Password**: `test123456` (or whatever password you set)

## Quick Setup Script (All-in-One)

Run this in Supabase SQL Editor to set up everything at once:

```sql
-- Step 1: Create auth user (you'll need to do this via Supabase Dashboard first)
-- Then get the user_id and run:

DO $$
DECLARE
  v_user_id UUID := 'USER_ID_FROM_DASHBOARD';  -- Replace with actual user ID
  v_customer_id UUID;
  v_lead_id UUID;
BEGIN
  -- Update profile role
  UPDATE profiles SET role = 'trainee' WHERE id = v_user_id;
  
  -- Create or find customer
  INSERT INTO customers (full_name, phone, email, user_id)
  VALUES ('Test Trainee', '0501234567', 'trainee@test.com', v_user_id)
  ON CONFLICT (user_id) DO UPDATE SET user_id = v_user_id
  RETURNING id INTO v_customer_id;
  
  -- Create a lead for the customer
  INSERT INTO leads (customer_id, full_name, status_main, fitness_goal, height, weight)
  VALUES (v_customer_id, 'Test Trainee', 'בטיפול', 'ירידה במשקל', 175, 80)
  RETURNING id INTO v_lead_id;
  
  RAISE NOTICE 'Setup complete! Customer ID: %, Lead ID: %', v_customer_id, v_lead_id;
END $$;
```

## What You'll See After Login

Once logged in as a trainee, you'll be redirected to `/client/dashboard` where you can see:

1. **Overview Tab**:
   - Personal stats (Weight, Height, BMI, Fitness Goal)
   - Profile editing (can edit weight/height)
   - Workout plan preview
   - Nutrition plan preview

2. **Workout Tab**: Full workout plan details (read-only)

3. **Nutrition Tab**: Full nutrition plan details (read-only)

4. **Daily Check-In Tab**: 
   - Submit daily check-ins
   - Track workout completion
   - Track steps goal
   - Track nutrition goals
   - Mark supplements taken
   - View compliance stats

## Troubleshooting

### "Profile not found" error
- Make sure the profile was created (should happen automatically via trigger)
- Check: `SELECT * FROM profiles WHERE id = 'USER_ID';`

### "Customer not found" error
- Make sure you linked the user to a customer: `SELECT * FROM customers WHERE user_id = 'USER_ID';`

### Can't login / Wrong password
- Reset password in Supabase Dashboard: Authentication → Users → Reset Password
- Or create a new user account

### Redirected to wrong dashboard
- Check the role: `SELECT role FROM profiles WHERE id = 'USER_ID';`
- Should be 'trainee', not 'admin' or 'user'

## Testing with Existing Customer "אנדריי שצוקין"

If you want to link a trainee account to the existing customer "אנדריי שצוקין":

```sql
-- 1. Create user via Supabase Dashboard, get USER_ID

-- 2. Update profile
UPDATE profiles SET role = 'trainee' WHERE id = 'USER_ID';

-- 3. Find and link customer
UPDATE customers 
SET user_id = 'USER_ID'
WHERE full_name LIKE '%אנדריי%' OR full_name LIKE '%Andrey%'
RETURNING id, full_name;
```

Then login with the email/password you created!

