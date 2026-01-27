-- =====================================================
-- Update Budget History Trigger
-- Created: 2026-02-05
-- Description: Update trigger to include all budget fields including supplement_template_id
-- =====================================================

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
            OLD.supplement_template_id IS DISTINCT FROM NEW.supplement_template_id OR
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
