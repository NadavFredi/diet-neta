-- =====================================================
-- Add Activity Entries and Ensure Manual Fields to Nutrition Templates
-- Created: 2026-01-21
-- Description: Adds activity_entries column for METs calculation data
--              Also ensures manual_override and manual_fields columns exist (in case previous migration wasn't run)
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Ensure manual_override column exists (in case previous migration wasn't run)
-- Structure: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }
-- Tracks which fields have been manually overridden
ALTER TABLE nutrition_templates
  ADD COLUMN IF NOT EXISTS manual_override JSONB DEFAULT '{}'::jsonb;

-- Ensure manual_fields column exists (in case previous migration wasn't run)
-- Structure: { steps: number | null, workouts: text | null, supplements: text | null }
-- Stores manual fields: steps, workouts, supplements
ALTER TABLE nutrition_templates
  ADD COLUMN IF NOT EXISTS manual_fields JSONB DEFAULT '{}'::jsonb;

-- Add activity_entries column for storing METs activity data
-- Structure: Array of { id: string, activityType: string, mets: number, minutesPerWeek: number }
ALTER TABLE nutrition_templates
  ADD COLUMN IF NOT EXISTS activity_entries JSONB DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN nutrition_templates.manual_override IS 'JSONB tracking which macro/calorie fields have been manually overridden: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }';
COMMENT ON COLUMN nutrition_templates.manual_fields IS 'JSONB storing manual fields: { steps: number | null, workouts: text | null, supplements: text | null }';
COMMENT ON COLUMN nutrition_templates.activity_entries IS 'JSONB array storing activity entries for METs calculation: [{ id: string, activityType: string, mets: number, minutesPerWeek: number }]';

-- Create GIN indexes for JSONB columns (enables fast queries on JSONB data)
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_manual_override ON nutrition_templates USING GIN (manual_override);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_manual_fields ON nutrition_templates USING GIN (manual_fields);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_activity_entries ON nutrition_templates USING GIN (activity_entries);

-- =====================================================
-- Migration Complete
-- =====================================================
