-- =====================================================
-- Create Steps Plans Table Migration
-- Created: 2026-01-04
-- Description: Create steps_plans table similar to supplement_plans
-- =====================================================

-- =====================================================
-- Create steps_plans table
-- =====================================================

CREATE TABLE IF NOT EXISTS steps_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    template_id UUID, -- For future use if steps templates are created
    
    -- Standard fields
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    
    -- Steps data
    steps_goal INTEGER NOT NULL DEFAULT 0,
    steps_instructions TEXT,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_steps_plans_user_id ON steps_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_steps_plans_lead_id ON steps_plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_steps_plans_customer_id ON steps_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_steps_plans_budget_id ON steps_plans(budget_id);
CREATE INDEX IF NOT EXISTS idx_steps_plans_start_date ON steps_plans(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_steps_plans_created_at ON steps_plans(created_at DESC);

-- Trigger to auto-update updated_at
-- Ensure the function exists first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_steps_plans_updated_at
    BEFORE UPDATE ON steps_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES for steps_plans
-- =====================================================

-- Enable RLS on steps_plans table
ALTER TABLE steps_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own steps plans
CREATE POLICY "Users can read own steps plans"
    ON steps_plans FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own steps plans
CREATE POLICY "Users can insert own steps plans"
    ON steps_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own steps plans
CREATE POLICY "Users can update own steps plans"
    ON steps_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own steps plans
CREATE POLICY "Users can delete own steps plans"
    ON steps_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Admins have full access to steps plans
CREATE POLICY "Admins have full access to steps plans"
    ON steps_plans FOR ALL
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

COMMENT ON TABLE steps_plans IS 'Steps plans linked to leads/customers and budgets';
COMMENT ON COLUMN steps_plans.budget_id IS 'Reference to the budget this steps plan was created from';
COMMENT ON COLUMN steps_plans.steps_goal IS 'Daily steps goal for this plan';
COMMENT ON COLUMN steps_plans.steps_instructions IS 'Instructions and guidelines for daily steps';

-- =====================================================
-- Migration Complete
-- =====================================================

