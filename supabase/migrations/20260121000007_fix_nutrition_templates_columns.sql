-- =====================================================
-- Fix Nutrition Templates Columns
-- Created: 2026-01-21
-- Description: Ensures all required columns exist in nutrition_templates table
--              This is a comprehensive fix for any missing columns
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Ensure manual_override column exists
-- Structure: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nutrition_templates' 
        AND column_name = 'manual_override'
    ) THEN
        ALTER TABLE nutrition_templates
        ADD COLUMN manual_override JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN nutrition_templates.manual_override IS 'JSONB tracking which macro/calorie fields have been manually overridden: { calories: boolean, protein: boolean, carbs: boolean, fat: boolean, fiber: boolean }';
    END IF;
END $$;

-- Ensure manual_fields column exists
-- Structure: { steps: number | null, workouts: text | null, supplements: text | null }
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nutrition_templates' 
        AND column_name = 'manual_fields'
    ) THEN
        ALTER TABLE nutrition_templates
        ADD COLUMN manual_fields JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN nutrition_templates.manual_fields IS 'JSONB storing manual fields: { steps: number | null, workouts: text | null, supplements: text | null }';
    END IF;
END $$;

-- Ensure activity_entries column exists
-- Structure: Array of { id: string, activityType: string, mets: number, minutesPerWeek: number }
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nutrition_templates' 
        AND column_name = 'activity_entries'
    ) THEN
        ALTER TABLE nutrition_templates
        ADD COLUMN activity_entries JSONB DEFAULT '[]'::jsonb;
        
        COMMENT ON COLUMN nutrition_templates.activity_entries IS 'JSONB array storing activity entries for METs calculation: [{ id: string, activityType: string, mets: number, minutesPerWeek: number }]';
    END IF;
END $$;

-- Create GIN indexes for JSONB columns (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_manual_override ON nutrition_templates USING GIN (manual_override);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_manual_fields ON nutrition_templates USING GIN (manual_fields);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_activity_entries ON nutrition_templates USING GIN (activity_entries);

-- =====================================================
-- Migration Complete
-- =====================================================
