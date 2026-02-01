-- =====================================================
-- Add steps_min and steps_max columns to budgets table
-- Created: 2026-02-29
-- Description: Add support for steps range (min/max) in addition to steps_goal
-- =====================================================

-- Add steps_min and steps_max columns
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS steps_min INTEGER,
ADD COLUMN IF NOT EXISTS steps_max INTEGER;

-- Add comments
COMMENT ON COLUMN budgets.steps_min IS 'Minimum daily steps goal (optional, for range support)';
COMMENT ON COLUMN budgets.steps_max IS 'Maximum daily steps goal (optional, for range support). If set, this takes precedence over steps_goal for display.';

-- =====================================================
-- Migration Complete
-- =====================================================
