-- =====================================================
-- Create Supplement Templates
-- Created: 2026-02-05
-- Description: Reusable supplement templates that can be imported by users
-- =====================================================

-- =====================================================
-- TABLE: supplement_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS supplement_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    supplements JSONB DEFAULT '[]'::jsonb, -- Array of supplements: [{ name: string, dosage: string, timing: string, link1: string, link2: string }]
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplement_templates_created_by ON supplement_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_supplement_templates_is_public ON supplement_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_supplement_templates_supplements ON supplement_templates USING GIN (supplements);
CREATE INDEX IF NOT EXISTS idx_supplement_templates_created_at ON supplement_templates(created_at DESC);

-- Trigger to auto-update updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_supplement_templates_updated_at'
    ) THEN
        CREATE TRIGGER update_supplement_templates_updated_at
            BEFORE UPDATE ON supplement_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on supplement_templates table
ALTER TABLE supplement_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view public or own supplement templates" ON supplement_templates;
DROP POLICY IF EXISTS "Users can insert own supplement templates" ON supplement_templates;
DROP POLICY IF EXISTS "Users can update own supplement templates" ON supplement_templates;
DROP POLICY IF EXISTS "Users can delete own supplement templates" ON supplement_templates;
DROP POLICY IF EXISTS "Admins have full access to supplement templates" ON supplement_templates;

-- Policy: Users can view public templates or their own templates
CREATE POLICY "Users can view public or own supplement templates"
    ON supplement_templates FOR SELECT
    USING (
        is_public = TRUE OR 
        created_by = auth.uid()
    );

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own supplement templates"
    ON supplement_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own supplement templates"
    ON supplement_templates FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own supplement templates"
    ON supplement_templates FOR DELETE
    USING (auth.uid() = created_by);

-- Policy: Admins have full access to templates
CREATE POLICY "Admins have full access to supplement templates"
    ON supplement_templates FOR ALL
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
-- Add supplement_template_id to budgets
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'budgets' 
        AND column_name = 'supplement_template_id'
    ) THEN
        ALTER TABLE budgets 
        ADD COLUMN supplement_template_id UUID REFERENCES supplement_templates(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_budgets_supplement_template_id ON budgets(supplement_template_id);
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE supplement_templates IS 'Reusable supplement templates that can be imported by users to create supplement plans';
COMMENT ON COLUMN supplement_templates.name IS 'Template name';
COMMENT ON COLUMN supplement_templates.description IS 'Template description';
COMMENT ON COLUMN supplement_templates.supplements IS 'JSONB array of supplements: [{ name: string, dosage: string, timing: string, link1: string, link2: string }]';
COMMENT ON COLUMN supplement_templates.is_public IS 'Whether the template is publicly visible to all users';
COMMENT ON COLUMN budgets.supplement_template_id IS 'Reference to the supplement template used in this budget';

-- =====================================================
-- Migration Complete
-- =====================================================
