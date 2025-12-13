-- =====================================================
-- Nutrition Plans Migration
-- Created: 2024-01-02
-- Description: User nutrition plans linked to leads (snapshot pattern - independent from templates)
-- =====================================================

-- =====================================================
-- TABLE: nutrition_plans
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    template_id UUID REFERENCES nutrition_templates(id) ON DELETE SET NULL,
    
    -- Standard fields
    start_date DATE NOT NULL,
    description TEXT,
    
    -- Nutrition targets (snapshot - independent from template)
    -- Structure: { calories: number, protein: number, carbs: number, fat: number, fiber: number }
    targets JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_lead_id ON nutrition_plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_template_id ON nutrition_plans(template_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_start_date ON nutrition_plans(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_created_at ON nutrition_plans(created_at DESC);

-- GIN index for JSONB column (enables fast queries on JSONB data)
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_targets ON nutrition_plans USING GIN (targets);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_nutrition_plans_updated_at
    BEFORE UPDATE ON nutrition_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on nutrition_plans table
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own nutrition plans
CREATE POLICY "Users can read own nutrition plans"
    ON nutrition_plans FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own nutrition plans
CREATE POLICY "Users can insert own nutrition plans"
    ON nutrition_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own nutrition plans
CREATE POLICY "Users can update own nutrition plans"
    ON nutrition_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own nutrition plans
CREATE POLICY "Users can delete own nutrition plans"
    ON nutrition_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Admins have full access to nutrition plans
CREATE POLICY "Admins have full access to nutrition plans"
    ON nutrition_plans FOR ALL
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

COMMENT ON TABLE nutrition_plans IS 'User nutrition plans linked to leads (snapshot pattern - independent from templates)';
COMMENT ON COLUMN nutrition_plans.lead_id IS 'Reference to the lead this plan is assigned to';
COMMENT ON COLUMN nutrition_plans.template_id IS 'Reference to the template this plan was created from (for tracking only, changes to template do not affect this plan)';
COMMENT ON COLUMN nutrition_plans.targets IS 'JSONB containing macro targets: { calories: number, protein: number, carbs: number, fat: number, fiber: number } - This is a snapshot, independent from the template';
COMMENT ON COLUMN nutrition_plans.start_date IS 'Date when the nutrition plan starts';

-- =====================================================
-- Migration Complete
-- =====================================================
