-- =====================================================
-- Add target_weight and target_waist to weekly_reviews
-- Created: 2026-01-22
-- Description: Add editable target columns for weight and waist measurements
-- =====================================================

-- Add target_weight column (NUMERIC to match weekly_avg_weight)
ALTER TABLE weekly_reviews
ADD COLUMN IF NOT EXISTS target_weight NUMERIC(5,2);

-- Add target_waist column (INTEGER to match waist_measurement)
ALTER TABLE weekly_reviews
ADD COLUMN IF NOT EXISTS target_waist INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN weekly_reviews.target_weight IS 'Target weight for the week (kg)';
COMMENT ON COLUMN weekly_reviews.target_waist IS 'Target waist circumference for the week (cm)';
