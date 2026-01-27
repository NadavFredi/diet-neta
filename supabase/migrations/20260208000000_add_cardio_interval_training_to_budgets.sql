-- =====================================================
-- Add Cardio and Interval Training to Budgets
-- Created: 2026-02-08
-- Description: Add JSONB columns for cardio_training and interval_training to budgets table
-- =====================================================

-- Add cardio_training column
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS cardio_training JSONB DEFAULT NULL;

-- Add interval_training column
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS interval_training JSONB DEFAULT NULL;

-- Add GIN indexes for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_budgets_cardio_training ON budgets USING GIN (cardio_training);
CREATE INDEX IF NOT EXISTS idx_budgets_interval_training ON budgets USING GIN (interval_training);

-- Add comments
COMMENT ON COLUMN budgets.cardio_training IS 'JSONB array of cardio training workouts: [{ id?: string, name: string, type: string, duration_minutes: number, workouts_per_week: number, notes: string }]';
COMMENT ON COLUMN budgets.interval_training IS 'JSONB array of interval training workouts: [{ id?: string, name: string, type: string, duration_minutes: number, workouts_per_week: number, notes: string }]';

-- =====================================================
-- Migration Complete
-- =====================================================
