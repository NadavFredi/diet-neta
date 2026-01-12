-- =====================================================
-- Fix Budget Links to Plans and Create Supplement Plans
-- Created: 2026-01-01
-- Description: Ensures budget_id columns exist in workout_plans and nutrition_plans,
--              and creates supplement_plans table if it doesn't exist
-- =====================================================

-- =====================================================
-- Add budget_id to workout_plans (if not exists)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workout_plans' 
        AND column_name = 'budget_id'
    ) THEN
        ALTER TABLE workout_plans 
        ADD COLUMN budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_workout_plans_budget_id ON workout_plans(budget_id);
        
        COMMENT ON COLUMN workout_plans.budget_id IS 'Reference to the budget this workout plan was created from';
    END IF;
END $$;

-- =====================================================
-- Add budget_id to nutrition_plans (if not exists)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nutrition_plans' 
        AND column_name = 'budget_id'
    ) THEN
        ALTER TABLE nutrition_plans 
        ADD COLUMN budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_nutrition_plans_budget_id ON nutrition_plans(budget_id);
        
        COMMENT ON COLUMN nutrition_plans.budget_id IS 'Reference to the budget this nutrition plan was created from';
    END IF;
END $$;

-- =====================================================
-- Create supplement_plans table (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS supplement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    template_id UUID, -- For future use if supplement templates are created
    
    -- Standard fields
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    
    -- Supplements (JSONB array)
    supplements JSONB DEFAULT '[]'::jsonb,
    -- Structure: [{ name: string, dosage: string, timing: string }]
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplement_plans_user_id ON supplement_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_lead_id ON supplement_plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_customer_id ON supplement_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_budget_id ON supplement_plans(budget_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_start_date ON supplement_plans(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_created_at ON supplement_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplement_plans_supplements ON supplement_plans USING GIN (supplements);

-- Trigger to auto-update updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_supplement_plans_updated_at'
    ) THEN
        CREATE TRIGGER update_supplement_plans_updated_at
            BEFORE UPDATE ON supplement_plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES for supplement_plans
-- =====================================================

-- Enable RLS on supplement_plans table
ALTER TABLE supplement_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own supplement plans" ON supplement_plans;
DROP POLICY IF EXISTS "Users can insert own supplement plans" ON supplement_plans;
DROP POLICY IF EXISTS "Users can update own supplement plans" ON supplement_plans;
DROP POLICY IF EXISTS "Users can delete own supplement plans" ON supplement_plans;
DROP POLICY IF EXISTS "Admins have full access to supplement plans" ON supplement_plans;

-- Policy: Users can read their own supplement plans
CREATE POLICY "Users can read own supplement plans"
    ON supplement_plans FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own supplement plans
CREATE POLICY "Users can insert own supplement plans"
    ON supplement_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own supplement plans
CREATE POLICY "Users can update own supplement plans"
    ON supplement_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own supplement plans
CREATE POLICY "Users can delete own supplement plans"
    ON supplement_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Admins have full access to supplement plans
CREATE POLICY "Admins have full access to supplement plans"
    ON supplement_plans FOR ALL
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

COMMENT ON TABLE supplement_plans IS 'Supplement plans linked to leads/customers and budgets';
COMMENT ON COLUMN supplement_plans.budget_id IS 'Reference to the budget this supplement plan was created from';
COMMENT ON COLUMN supplement_plans.supplements IS 'JSONB array of supplements: [{ name: string, dosage: string, timing: string }]';

-- =====================================================
-- Migration Complete
-- =====================================================

