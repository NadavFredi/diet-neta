-- =====================================================
-- Add is_active to nutrition_plans
-- Created: 2026-01-21
-- Description: Add is_active and deleted_at columns to nutrition_plans for consistency with workout_plans
--              This allows tracking active vs inactive nutrition plans
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Add is_active and deleted_at columns
ALTER TABLE nutrition_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_is_active ON nutrition_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_deleted_at ON nutrition_plans(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update existing plans to be active
UPDATE nutrition_plans SET is_active = true WHERE is_active IS NULL;

-- Add comments
COMMENT ON COLUMN nutrition_plans.is_active IS 'Whether this nutrition plan is currently active';
COMMENT ON COLUMN nutrition_plans.deleted_at IS 'Timestamp when this nutrition plan was deleted (soft delete)';

-- =====================================================
-- Migration Complete
-- =====================================================
