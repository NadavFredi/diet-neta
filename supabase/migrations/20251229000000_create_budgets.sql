-- =====================================================
-- Budgets (Taktziv) Migration
-- Created: 2024-12-29
-- Description: Master budget templates that aggregate nutrition, workout, steps, and supplements
-- =====================================================

-- =====================================================
-- TABLE: budgets (Budget Templates)
-- =====================================================

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Nutrition Master (can link to nutrition_template or have custom values)
    nutrition_template_id UUID REFERENCES nutrition_templates(id) ON DELETE SET NULL,
    nutrition_targets JSONB DEFAULT '{}'::jsonb,
    -- Structure: { calories: number, protein: number, carbs: number, fat: number, fiber_min: number, water_min: number }
    
    -- Steps Module
    steps_goal INTEGER DEFAULT 0,
    steps_instructions TEXT,
    
    -- Workout Link
    workout_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    
    -- Supplements Module (JSONB array)
    supplements JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ name: string, dosage: string, timing: string }]
    
    -- Guidelines
    eating_order TEXT, -- e.g., "Vegetables -> Protein -> Carbs"
    eating_rules TEXT, -- e.g., "Don't eat carbs alone"
    
    -- Metadata
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);
CREATE INDEX IF NOT EXISTS idx_budgets_is_public ON budgets(is_public);
CREATE INDEX IF NOT EXISTS idx_budgets_nutrition_template_id ON budgets(nutrition_template_id);
CREATE INDEX IF NOT EXISTS idx_budgets_workout_template_id ON budgets(workout_template_id);
CREATE INDEX IF NOT EXISTS idx_budgets_nutrition_targets ON budgets USING GIN (nutrition_targets);
CREATE INDEX IF NOT EXISTS idx_budgets_supplements ON budgets USING GIN (supplements);
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: budget_assignments (Active Client Budgets)
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Assignment metadata
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Notes specific to this assignment
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_assignments_budget_id ON budget_assignments(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_assignments_lead_id ON budget_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_budget_assignments_customer_id ON budget_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_budget_assignments_is_active ON budget_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_budget_assignments_assigned_at ON budget_assignments(assigned_at DESC);

-- Unique constraint: One active budget per lead/customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_assignments_unique_active_lead 
    ON budget_assignments(lead_id) 
    WHERE is_active = TRUE AND lead_id IS NOT NULL;
    
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_assignments_unique_active_customer 
    ON budget_assignments(customer_id) 
    WHERE is_active = TRUE AND customer_id IS NOT NULL;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_budget_assignments_updated_at
    BEFORE UPDATE ON budget_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on budgets table
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view public budgets or their own budgets
CREATE POLICY "Users can view public or own budgets"
    ON budgets FOR SELECT
    USING (
        is_public = TRUE OR 
        created_by = auth.uid()
    );

-- Policy: Users can insert their own budgets
CREATE POLICY "Users can insert own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own budgets
CREATE POLICY "Users can update own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own budgets
CREATE POLICY "Users can delete own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = created_by);

-- Policy: Admins have full access to budgets
CREATE POLICY "Admins have full access to budgets"
    ON budgets FOR ALL
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

-- Enable RLS on budget_assignments table
ALTER TABLE budget_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments for their own leads/customers or if they created the budget
CREATE POLICY "Users can view relevant budget assignments"
    ON budget_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_assignments.budget_id
            AND (budgets.created_by = auth.uid() OR budgets.is_public = TRUE)
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can insert assignments if they own the budget
CREATE POLICY "Users can insert budget assignments for own budgets"
    ON budget_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_assignments.budget_id
            AND budgets.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can update assignments if they own the budget
CREATE POLICY "Users can update budget assignments for own budgets"
    ON budget_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_assignments.budget_id
            AND budgets.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_assignments.budget_id
            AND budgets.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can delete assignments if they own the budget
CREATE POLICY "Users can delete budget assignments for own budgets"
    ON budget_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_assignments.budget_id
            AND budgets.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE budgets IS 'Master budget templates that aggregate nutrition, workout, steps, and supplements';
COMMENT ON COLUMN budgets.nutrition_targets IS 'JSONB containing macro targets: { calories: number, protein: number, carbs: number, fat: number, fiber_min: number, water_min: number }';
COMMENT ON COLUMN budgets.supplements IS 'JSONB array of supplements: [{ name: string, dosage: string, timing: string }]';
COMMENT ON TABLE budget_assignments IS 'Active budget assignments to leads/customers';
COMMENT ON COLUMN budget_assignments.is_active IS 'Only one active budget per lead/customer at a time';

-- =====================================================
-- Migration Complete
-- =====================================================

