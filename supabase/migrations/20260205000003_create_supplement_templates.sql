-- =====================================================
-- Create Supplement Templates
-- Created: 2026-02-05
-- Description: Create supplement templates table and link to budgets
-- =====================================================

-- Create supplement_templates table
CREATE TABLE IF NOT EXISTS supplement_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    supplements JSONB DEFAULT '[]'::jsonb, -- Array of { name: string, link1: string, link2: string }
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplement_templates_created_by ON supplement_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_supplement_templates_created_at ON supplement_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_templates_is_public ON supplement_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_supplement_templates_supplements ON supplement_templates USING GIN (supplements);

-- Trigger for updated_at
CREATE TRIGGER update_supplement_templates_updated_at
    BEFORE UPDATE ON supplement_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE supplement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public or own supplement templates"
    ON supplement_templates FOR SELECT
    USING (is_public = TRUE OR created_by = auth.uid());

CREATE POLICY "Users can insert own supplement templates"
    ON supplement_templates FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own supplement templates"
    ON supplement_templates FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own supplement templates"
    ON supplement_templates FOR DELETE
    USING (auth.uid() = created_by);

CREATE POLICY "Admins have full access to supplement templates"
    ON supplement_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add supplement_template_id to budgets
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

COMMENT ON TABLE supplement_templates IS 'Reusable supplement templates containing lists of additives with links';
