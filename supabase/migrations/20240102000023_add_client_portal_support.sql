-- Migration: Add Client Portal Support
-- Created: 2024-01-02
-- Description: Enable client/trainee role, link customers to auth users, and create daily check-ins

-- =====================================================
-- 1. UPDATE profiles.role to include 'trainee'
-- =====================================================

-- Drop the existing CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new CHECK constraint with 'trainee' role
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'trainee'));

-- Update comment
COMMENT ON COLUMN profiles.role IS 'User role: admin (coach/admin), user (coach), trainee (client/trainee)';

-- =====================================================
-- 2. ADD user_id to customers table
-- =====================================================

-- Add user_id column to customers (nullable, as existing customers may not have user accounts yet)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Add unique constraint to ensure one user can only be linked to one customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id_unique ON customers(user_id) 
WHERE user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN customers.user_id IS 'Link to auth.users - allows clients to log in and access their portal';

-- =====================================================
-- 3. CREATE daily_check_ins table
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Check-in statuses
  workout_completed BOOLEAN DEFAULT false,
  steps_goal_met BOOLEAN DEFAULT false,
  steps_actual INTEGER, -- Actual steps taken (optional)
  nutrition_goal_met BOOLEAN DEFAULT false,
  supplements_taken JSONB DEFAULT '[]'::jsonb, -- Array of supplement names taken
  
  -- Additional notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ensure one check-in per customer per day
  UNIQUE(customer_id, check_in_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_customer_id ON daily_check_ins(customer_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_lead_id ON daily_check_ins(lead_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_date ON daily_check_ins(check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_customer_date ON daily_check_ins(customer_id, check_in_date DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_daily_check_ins_updated_at
  BEFORE UPDATE ON daily_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE daily_check_ins IS 'Daily check-in records for client compliance tracking';
COMMENT ON COLUMN daily_check_ins.workout_completed IS 'Whether the client completed their workout for the day';
COMMENT ON COLUMN daily_check_ins.steps_goal_met IS 'Whether the client met their daily steps goal';
COMMENT ON COLUMN daily_check_ins.steps_actual IS 'Actual number of steps taken (optional, for detailed tracking)';
COMMENT ON COLUMN daily_check_ins.nutrition_goal_met IS 'Whether the client met their nutrition/macro goals';
COMMENT ON COLUMN daily_check_ins.supplements_taken IS 'JSONB array of supplement names that were taken';

-- =====================================================
-- 4. ENABLE RLS ON daily_check_ins
-- =====================================================

ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

-- Policy: Trainees can view their own check-ins
CREATE POLICY "Trainees can view own check-ins"
  ON daily_check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = daily_check_ins.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Policy: Trainees can insert their own check-ins
CREATE POLICY "Trainees can insert own check-ins"
  ON daily_check_ins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = daily_check_ins.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Policy: Trainees can update their own check-ins
CREATE POLICY "Trainees can update own check-ins"
  ON daily_check_ins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = daily_check_ins.customer_id
      AND customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = daily_check_ins.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Policy: Coaches/admins can view all check-ins
CREATE POLICY "Coaches can view all check-ins"
  ON daily_check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'user')
    )
  );

-- Policy: Coaches/admins can insert check-ins for any customer
CREATE POLICY "Coaches can insert check-ins"
  ON daily_check_ins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'user')
    )
  );

-- Policy: Coaches/admins can update check-ins for any customer
CREATE POLICY "Coaches can update check-ins"
  ON daily_check_ins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'user')
    )
  );

-- =====================================================
-- 5. UPDATE RLS POLICIES FOR customers
-- =====================================================

-- Policy: Trainees can view their own customer record
CREATE POLICY "Trainees can view own customer"
  ON customers FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Trainees can update their own customer record (for profile editing)
CREATE POLICY "Trainees can update own customer"
  ON customers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 6. UPDATE RLS POLICIES FOR leads (for trainee access)
-- =====================================================

-- Policy: Trainees can view leads associated with their customer_id
CREATE POLICY "Trainees can view own leads"
  ON leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = leads.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Policy: Trainees can update their own leads (for weight, height, etc.)
CREATE POLICY "Trainees can update own leads"
  ON leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = leads.customer_id
      AND customers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = leads.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- =====================================================
-- Migration Complete
-- =====================================================

