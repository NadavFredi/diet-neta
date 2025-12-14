-- =====================================================
-- Add template_id to workout_plans
-- Created: 2024-01-02
-- Description: Track which template a workout plan was created from (reference only, snapshot pattern maintained)
-- =====================================================

-- Add template_id column (nullable, just for reference)
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_template_id ON workout_plans(template_id);

-- Note: This is a reference only. The actual routine_data is stored in workout_plans.custom_attributes
-- When a template is changed, existing workout_plans remain independent (snapshot pattern)



