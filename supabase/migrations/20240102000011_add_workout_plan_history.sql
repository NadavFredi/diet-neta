-- =====================================================
-- Add history tracking to workout_plans
-- Created: 2024-01-02
-- Description: Add is_active and deleted_at fields to track workout plan history
-- =====================================================

-- Add is_active and deleted_at columns
ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_workout_plans_is_active ON workout_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workout_plans_deleted_at ON workout_plans(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update existing plans to be active
UPDATE workout_plans SET is_active = true WHERE is_active IS NULL;

-- =====================================================
-- Migration Complete
-- =====================================================
