-- =====================================================
-- Nutrition Templates Migration
-- Created: 2024-01-02
-- Description: Reusable nutrition templates for macro-nutrient planning and calculation
-- =====================================================

-- =====================================================
-- TABLE: nutrition_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    targets JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure: { calories: number, protein: number, carbs: number, fat: number, fiber: number }
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_created_by ON nutrition_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_is_public ON nutrition_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_targets ON nutrition_templates USING GIN (targets);
CREATE INDEX IF NOT EXISTS idx_nutrition_templates_created_at ON nutrition_templates(created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_nutrition_templates_updated_at
    BEFORE UPDATE ON nutrition_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on nutrition_templates table
ALTER TABLE nutrition_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public templates or their own templates
CREATE POLICY "Users can view public or own nutrition templates"
    ON nutrition_templates FOR SELECT
    USING (
        is_public = TRUE OR 
        created_by = auth.uid()
    );

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own nutrition templates"
    ON nutrition_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own nutrition templates"
    ON nutrition_templates FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own nutrition templates"
    ON nutrition_templates FOR DELETE
    USING (auth.uid() = created_by);

-- Policy: Admins have full access to templates
CREATE POLICY "Admins have full access to nutrition templates"
    ON nutrition_templates FOR ALL
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

COMMENT ON TABLE nutrition_templates IS 'Reusable nutrition templates for macro-nutrient planning and calculation';
COMMENT ON COLUMN nutrition_templates.name IS 'Template name';
COMMENT ON COLUMN nutrition_templates.description IS 'Template description';
COMMENT ON COLUMN nutrition_templates.targets IS 'JSONB containing macro targets: { calories: number, protein: number, carbs: number, fat: number, fiber: number }';
COMMENT ON COLUMN nutrition_templates.is_public IS 'Whether the template is publicly visible to all users';

-- =====================================================
-- Migration Complete
-- =====================================================

