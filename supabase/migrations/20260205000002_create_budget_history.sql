-- =====================================================
-- Budget History Migration
-- Created: 2026-02-05
-- Description: Track changes to budgets for audit history
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    change_type TEXT NOT NULL, -- 'create', 'update'
    changes JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store old and new values
    snapshot JSONB -- Full snapshot of the budget after change
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_history_budget_id ON budget_history(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_history_changed_at ON budget_history(changed_at DESC);

-- Enable RLS
ALTER TABLE budget_history ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admins/Staff can view all history
CREATE POLICY "Staff can view all budget history"
    ON budget_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coach')
        )
    );

-- Users can view history of budgets they created
CREATE POLICY "Users can view history of own budgets"
    ON budget_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM budgets
            WHERE budgets.id = budget_history.budget_id
            AND budgets.created_by = auth.uid()
        )
    );

-- Trigger Function
CREATE OR REPLACE FUNCTION log_budget_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    user_id UUID;
BEGIN
    user_id := auth.uid();
    
    IF (TG_OP = 'UPDATE') THEN
        -- Only log if there are actual changes to relevant fields
        -- We ignore updated_at
        IF (OLD.name IS DISTINCT FROM NEW.name OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.nutrition_template_id IS DISTINCT FROM NEW.nutrition_template_id OR
            OLD.nutrition_targets IS DISTINCT FROM NEW.nutrition_targets OR
            OLD.steps_goal IS DISTINCT FROM NEW.steps_goal OR
            OLD.steps_instructions IS DISTINCT FROM NEW.steps_instructions OR
            OLD.workout_template_id IS DISTINCT FROM NEW.workout_template_id OR
            OLD.supplements IS DISTINCT FROM NEW.supplements OR
            OLD.eating_order IS DISTINCT FROM NEW.eating_order OR
            OLD.eating_rules IS DISTINCT FROM NEW.eating_rules OR
            OLD.is_public IS DISTINCT FROM NEW.is_public) THEN
            
            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            );
            
            INSERT INTO budget_history (budget_id, changed_at, changed_by, change_type, changes, snapshot)
            VALUES (NEW.id, NOW(), user_id, 'update', changes_json, to_jsonb(NEW));
        END IF;
        
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO budget_history (budget_id, changed_at, changed_by, change_type, changes, snapshot)
        VALUES (NEW.id, NOW(), user_id, 'create', '{}'::jsonb, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS log_budget_changes_trigger ON budgets;
CREATE TRIGGER log_budget_changes_trigger
    AFTER INSERT OR UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION log_budget_changes();
