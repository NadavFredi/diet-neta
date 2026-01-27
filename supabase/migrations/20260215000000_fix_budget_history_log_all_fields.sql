-- =====================================================
-- Fix Budget History to Log All Fields
-- Created: 2026-02-15
-- Description: 
-- 1. Update log_budget_changes() to include ALL budget fields including cardio_training and interval_training
-- 2. Ensure lead_id is properly set when logging budget changes
-- 3. Make sure every field change in the action plan is logged
-- =====================================================

CREATE OR REPLACE FUNCTION log_budget_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    user_id UUID;
    lead_id_val UUID;
BEGIN
    user_id := auth.uid();
    
    -- Get lead_id from the most recent active budget assignment
    -- This ensures we track which lead's action plan was changed
    SELECT lead_id INTO lead_id_val
    FROM budget_assignments
    WHERE budget_id = NEW.id
      AND is_active = TRUE
    ORDER BY assigned_at DESC
    LIMIT 1;
    
    IF (TG_OP = 'UPDATE') THEN
        -- Check ALL fields that can be changed in an action plan
        -- We ignore: updated_at, created_at, created_by, id
        IF (OLD.name IS DISTINCT FROM NEW.name OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.nutrition_template_id IS DISTINCT FROM NEW.nutrition_template_id OR
            OLD.nutrition_targets IS DISTINCT FROM NEW.nutrition_targets OR
            OLD.steps_goal IS DISTINCT FROM NEW.steps_goal OR
            OLD.steps_instructions IS DISTINCT FROM NEW.steps_instructions OR
            OLD.workout_template_id IS DISTINCT FROM NEW.workout_template_id OR
            OLD.supplement_template_id IS DISTINCT FROM NEW.supplement_template_id OR
            OLD.supplements IS DISTINCT FROM NEW.supplements OR
            OLD.eating_order IS DISTINCT FROM NEW.eating_order OR
            OLD.eating_rules IS DISTINCT FROM NEW.eating_rules OR
            OLD.cardio_training IS DISTINCT FROM NEW.cardio_training OR
            OLD.interval_training IS DISTINCT FROM NEW.interval_training OR
            OLD.is_public IS DISTINCT FROM NEW.is_public) THEN
            
            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            );
            
            INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
            VALUES (NEW.id, lead_id_val, NOW(), user_id, 'update', changes_json, to_jsonb(NEW));
        END IF;
        
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        -- For new budgets, try to get lead_id if it exists
        -- (though typically new budgets won't have assignments yet)
        INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
        VALUES (NEW.id, lead_id_val, NOW(), user_id, 'create', '{}'::jsonb, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists and is active
DROP TRIGGER IF EXISTS log_budget_changes_trigger ON budgets;
CREATE TRIGGER log_budget_changes_trigger
    AFTER INSERT OR UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION log_budget_changes();

-- =====================================================
-- Migration Complete
-- =====================================================
