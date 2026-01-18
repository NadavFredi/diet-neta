-- =====================================================
-- Add Manual Override Fields to Nutrition Templates
-- Created: 2026-01-20
-- Description: Adds manual override state tracking and new fields (steps, workouts, supplements)
--              to allow professional users to set values manually without auto-calculation
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Add manual override tracking and new fields to nutrition_templates
ALTER TABLE nutrition_templates
  ADD COLUMN IF NOT EXISTS manual_override JSONB DEFAULT '{}'::jsonb,
  -- Structure: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }
  -- Tracks which fields have been manually overridden
  ADD COLUMN IF NOT EXISTS manual_fields JSONB DEFAULT '{}'::jsonb;
  -- Structure: { steps: number | null, workouts: text | null, supplements: text | null }
  -- Stores manual fields: steps, workouts, supplements

-- Add comment
COMMENT ON COLUMN nutrition_templates.manual_override IS 'JSONB tracking which macro/calorie fields have been manually overridden: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }';
COMMENT ON COLUMN nutrition_templates.manual_fields IS 'JSONB storing manual fields: { steps: number | null, workouts: text | null, supplements: text | null }';

-- Create GIN index for manual_override JSONB column (enables fast queries on JSONB data)
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_manual_override ON nutrition_templates USING GIN (manual_override);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_manual_fields ON nutrition_templates USING GIN (manual_fields);

-- =====================================================
-- Migration Complete
-- =====================================================