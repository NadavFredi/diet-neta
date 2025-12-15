-- =====================================================
-- Service Data Relocation: Move Coaching Data from Leads to Customers
-- Created: 2024-01-02
-- Description: Relocate ownership of coaching data (Workouts, Nutrition, Steps, Measurements)
--              from Lead entity to Customer entity
-- Philosophy: Lead = Sales/CRM, Customer = Service/Coaching
-- =====================================================

-- =====================================================
-- STEP A: Add customer_id to service tables
-- =====================================================

-- Add customer_id to workout_plans
ALTER TABLE workout_plans
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Add customer_id to nutrition_plans
ALTER TABLE nutrition_plans
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Create indexes for customer_id
CREATE INDEX IF NOT EXISTS idx_workout_plans_customer_id ON workout_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_customer_id ON nutrition_plans(customer_id);

-- =====================================================
-- STEP B: Migrate existing data (populate customer_id from lead_id)
-- =====================================================

-- Migrate workout_plans: Set customer_id based on lead_id -> customer_id relationship
UPDATE workout_plans wp
SET customer_id = l.customer_id
FROM leads l
WHERE wp.lead_id = l.id
  AND wp.customer_id IS NULL
  AND l.customer_id IS NOT NULL;

-- Migrate nutrition_plans: Set customer_id based on lead_id -> customer_id relationship
UPDATE nutrition_plans np
SET customer_id = l.customer_id
FROM leads l
WHERE np.lead_id = l.id
  AND np.customer_id IS NULL
  AND l.customer_id IS NOT NULL;

-- Handle orphaned records: Delete workout_plans that can't be linked to a customer
-- (These are orphaned records with invalid lead_id references or NULL lead_id)
-- First, try to find customer_id through any remaining valid lead relationships
UPDATE workout_plans wp
SET customer_id = l.customer_id
FROM leads l
WHERE wp.lead_id = l.id
  AND wp.customer_id IS NULL
  AND l.customer_id IS NOT NULL;

-- Now delete any remaining orphaned records that still have NULL customer_id
DELETE FROM workout_plans
WHERE customer_id IS NULL;

-- Handle orphaned records: Delete nutrition_plans that can't be linked to a customer
-- First, try to find customer_id through any remaining valid lead relationships
UPDATE nutrition_plans np
SET customer_id = l.customer_id
FROM leads l
WHERE np.lead_id = l.id
  AND np.customer_id IS NULL
  AND l.customer_id IS NOT NULL;

-- Now delete any remaining orphaned records that still have NULL customer_id
DELETE FROM nutrition_plans
WHERE customer_id IS NULL;

-- =====================================================
-- STEP C: Add coaching data columns to customers table
-- =====================================================

-- Add coaching data JSONB columns to customers
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS daily_protocol JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS workout_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS steps_history JSONB DEFAULT '[]'::jsonb;

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_customers_daily_protocol ON customers USING GIN (daily_protocol);
CREATE INDEX IF NOT EXISTS idx_customers_workout_history ON customers USING GIN (workout_history);
CREATE INDEX IF NOT EXISTS idx_customers_steps_history ON customers USING GIN (steps_history);

-- =====================================================
-- STEP D: Migrate coaching data from leads to customers
-- =====================================================

-- Migrate daily_protocol, workout_history, steps_history from leads to customers
-- Aggregate data per customer (in case of multiple leads per customer)
-- Note: Since we're resetting the DB, this migration step is mainly for documentation
-- In a production migration, you would aggregate data from all leads per customer
UPDATE customers c
SET 
    daily_protocol = COALESCE(
        (SELECT daily_protocol FROM leads WHERE customer_id = c.id AND daily_protocol IS NOT NULL AND daily_protocol != '{}'::jsonb ORDER BY created_at DESC LIMIT 1),
        '{}'::jsonb
    ),
    workout_history = COALESCE(
        (
            SELECT jsonb_agg(DISTINCT elem)
            FROM leads l, jsonb_array_elements(l.workout_history) elem
            WHERE l.customer_id = c.id 
              AND l.workout_history IS NOT NULL 
              AND l.workout_history != '[]'::jsonb
        ),
        '[]'::jsonb
    ),
    steps_history = COALESCE(
        (
            SELECT jsonb_agg(DISTINCT elem)
            FROM leads l, jsonb_array_elements(l.steps_history) elem
            WHERE l.customer_id = c.id 
              AND l.steps_history IS NOT NULL 
              AND l.steps_history != '[]'::jsonb
        ),
        '[]'::jsonb
    )
WHERE EXISTS (SELECT 1 FROM leads WHERE customer_id = c.id);

-- =====================================================
-- STEP E: Make customer_id NOT NULL and deprecate lead_id
-- =====================================================

-- Verify all records have customer_id before setting NOT NULL
-- (This should pass after orphaned records are deleted in Step B)
DO $$
BEGIN
    -- Check for any remaining NULL customer_id values
    IF EXISTS (SELECT 1 FROM workout_plans WHERE customer_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot set NOT NULL: workout_plans still contains NULL customer_id values. Please check orphaned records.';
    END IF;
    
    IF EXISTS (SELECT 1 FROM nutrition_plans WHERE customer_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot set NOT NULL: nutrition_plans still contains NULL customer_id values. Please check orphaned records.';
    END IF;
END $$;

-- For workout_plans: Make customer_id required for new records (keep lead_id nullable for backward compatibility)
-- Note: We keep lead_id for now but it's deprecated - new records should use customer_id
ALTER TABLE workout_plans
    ALTER COLUMN customer_id SET NOT NULL;

-- For nutrition_plans: Make customer_id required for new records
ALTER TABLE nutrition_plans
    ALTER COLUMN customer_id SET NOT NULL;

-- Drop the foreign key constraint on lead_id (we'll keep the column but remove the constraint)
-- This allows us to keep historical data but prevents new relationships
ALTER TABLE workout_plans
    DROP CONSTRAINT IF EXISTS workout_plans_lead_id_fkey;

ALTER TABLE nutrition_plans
    DROP CONSTRAINT IF EXISTS nutrition_plans_lead_id_fkey;

-- Add comments to mark lead_id as deprecated
COMMENT ON COLUMN workout_plans.lead_id IS 'DEPRECATED: Use customer_id instead. This column is kept for historical data only.';
COMMENT ON COLUMN nutrition_plans.lead_id IS 'DEPRECATED: Use customer_id instead. This column is kept for historical data only.';

-- =====================================================
-- STEP F: Update RLS policies to use customer_id
-- =====================================================

-- Note: RLS policies will need to be updated in application logic
-- The policies currently check user_id, which is still valid
-- We add customer-based policies for admin access

-- Policy: Admins can read all workout plans by customer
DROP POLICY IF EXISTS "Admins can read workout plans by customer" ON workout_plans;
CREATE POLICY "Admins can read workout plans by customer"
    ON workout_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admins can read all nutrition plans by customer
DROP POLICY IF EXISTS "Admins can read nutrition plans by customer" ON nutrition_plans;
CREATE POLICY "Admins can read nutrition plans by customer"
    ON nutrition_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- STEP G: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN customers.daily_protocol IS 'JSONB: { "stepsGoal": number, "workoutGoal": number, "supplements": string[] } - Coaching protocol data';
COMMENT ON COLUMN customers.workout_history IS 'JSONB: Array of workout program objects with dates, splits, and descriptions - Historical coaching data';
COMMENT ON COLUMN customers.steps_history IS 'JSONB: Array of step tracking objects with week numbers, dates, and targets - Historical coaching data';
COMMENT ON COLUMN workout_plans.customer_id IS 'Reference to the customer this workout plan belongs to (coaching data)';
COMMENT ON COLUMN nutrition_plans.customer_id IS 'Reference to the customer this nutrition plan belongs to (coaching data)';

-- =====================================================
-- Migration Complete
-- =====================================================


