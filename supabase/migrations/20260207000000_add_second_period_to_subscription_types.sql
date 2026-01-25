-- =====================================================
-- Add Second Period to Subscription Types
-- Created: 2026-02-07
-- Description: Adds support for bundle subscription types with 2 periods
--              Stores second period data as JSONB for flexibility
-- =====================================================

SET search_path TO public;

-- Add second_period column to subscription_types table
ALTER TABLE subscription_types 
ADD COLUMN IF NOT EXISTS second_period JSONB DEFAULT NULL;

-- Add comment for second_period column
COMMENT ON COLUMN subscription_types.second_period IS 'Second period data for bundle subscriptions. Contains: duration, duration_unit, price, currency';

-- Create index for second_period queries (if needed for filtering)
CREATE INDEX IF NOT EXISTS idx_subscription_types_has_second_period 
ON subscription_types((second_period IS NOT NULL)) 
WHERE second_period IS NOT NULL;

-- =====================================================
-- Migration Complete
-- =====================================================
