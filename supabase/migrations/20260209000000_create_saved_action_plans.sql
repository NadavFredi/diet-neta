-- =====================================================
-- Saved Action Plans Migration
-- Created: 2026-02-09
-- Description: Store snapshots of action plans (budgets) for viewing historical versions
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    
    -- Snapshot data - stores complete copy of the action plan at time of save
    name TEXT NOT NULL,
    description TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Full snapshot of all budget data
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure includes:
    -- - nutrition_template_id, nutrition_targets
    -- - workout_template_id, workout_template (full data)
    -- - supplements
    -- - cardio_training
    -- - interval_training
    -- - steps_goal, steps_instructions
    -- - eating_order, eating_rules
    -- - nutrition_template (full data if linked)
    
    -- Optional metadata
    notes TEXT -- User notes about this saved version
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_action_plans_user_id ON saved_action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_action_plans_budget_id ON saved_action_plans(budget_id);
CREATE INDEX IF NOT EXISTS idx_saved_action_plans_saved_at ON saved_action_plans(saved_at DESC);

-- Enable RLS
ALTER TABLE saved_action_plans ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can view their own saved action plans
CREATE POLICY "Users can view own saved action plans"
    ON saved_action_plans FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own saved action plans
CREATE POLICY "Users can insert own saved action plans"
    ON saved_action_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved action plans
CREATE POLICY "Users can update own saved action plans"
    ON saved_action_plans FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved action plans
CREATE POLICY "Users can delete own saved action plans"
    ON saved_action_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to saved action plans"
    ON saved_action_plans
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'user')
        )
    );

-- Comments
COMMENT ON TABLE saved_action_plans IS 'Saved snapshots of action plans (budgets) for historical viewing';
COMMENT ON COLUMN saved_action_plans.snapshot IS 'Complete snapshot of budget data including all templates and related data';
COMMENT ON COLUMN saved_action_plans.budget_id IS 'Reference to the original budget (may be null if budget was deleted)';
