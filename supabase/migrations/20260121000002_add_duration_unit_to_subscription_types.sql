-- =====================================================
-- Add Duration Unit to Subscription Types
-- Created: 2026-01-21
-- Description: Allow subscription types to specify duration in days, weeks, or months
-- =====================================================

-- Add duration_unit column with default 'months' for backward compatibility
ALTER TABLE subscription_types
ADD COLUMN IF NOT EXISTS duration_unit TEXT NOT NULL DEFAULT 'months'
CHECK (duration_unit IN ('days', 'weeks', 'months'));

-- Update comment on duration column
COMMENT ON COLUMN subscription_types.duration IS 'Duration value (interpreted based on duration_unit)';
COMMENT ON COLUMN subscription_types.duration_unit IS 'Unit for duration: days, weeks, or months';

-- =====================================================
-- Migration Complete
-- =====================================================
