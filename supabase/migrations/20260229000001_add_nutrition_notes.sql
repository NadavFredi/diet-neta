-- =====================================================
-- Add nutrition_notes to nutrition_templates and nutrition_plans
-- Created: 2026-02-29
-- Description: Add notes field for nutrition templates and plans
-- =====================================================

-- Add nutrition_notes to nutrition_templates
ALTER TABLE nutrition_templates
ADD COLUMN IF NOT EXISTS nutrition_notes TEXT;

-- Add nutrition_notes to nutrition_plans
ALTER TABLE nutrition_plans
ADD COLUMN IF NOT EXISTS nutrition_notes TEXT;

-- Add comments
COMMENT ON COLUMN nutrition_templates.nutrition_notes IS 'Additional notes and instructions for the nutrition template';
COMMENT ON COLUMN nutrition_plans.nutrition_notes IS 'Additional notes and instructions for the nutrition plan';
