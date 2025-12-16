-- =====================================================
-- Workout Templates Migration
-- Created: 2024-01-02
-- Description: Reusable workout templates that can be imported by users
-- =====================================================

-- =====================================================
-- TABLE: workout_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    goal_tags TEXT[] DEFAULT '{}',
    routine_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_templates_created_by ON workout_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workout_templates_is_public ON workout_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workout_templates_goal_tags ON workout_templates USING GIN (goal_tags);
CREATE INDEX IF NOT EXISTS idx_workout_templates_routine_data ON workout_templates USING GIN (routine_data);
CREATE INDEX IF NOT EXISTS idx_workout_templates_created_at ON workout_templates(created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_workout_templates_updated_at
    BEFORE UPDATE ON workout_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on workout_templates table
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public templates or their own templates
CREATE POLICY "Users can view public or own templates"
    ON workout_templates FOR SELECT
    USING (
        is_public = TRUE OR 
        created_by = auth.uid()
    );

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own templates"
    ON workout_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
    ON workout_templates FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
    ON workout_templates FOR DELETE
    USING (auth.uid() = created_by);

-- Policy: Admins have full access to templates
CREATE POLICY "Admins have full access to templates"
    ON workout_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE workout_templates IS 'Reusable workout templates that can be imported by users to create workout plans';
COMMENT ON COLUMN workout_templates.name IS 'Template name';
COMMENT ON COLUMN workout_templates.description IS 'Template description';
COMMENT ON COLUMN workout_templates.goal_tags IS 'Array of goal tags (e.g., ["חיטוב", "כוח", "סיבולת"])';
COMMENT ON COLUMN workout_templates.routine_data IS 'JSONB containing the workout routine data (matches workout_plans.custom_attributes.data.weeklyWorkout schema)';
COMMENT ON COLUMN workout_templates.is_public IS 'Whether the template is publicly visible to all users';

-- =====================================================
-- Migration Complete
-- =====================================================







