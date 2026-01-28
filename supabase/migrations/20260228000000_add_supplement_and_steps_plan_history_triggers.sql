-- =====================================================
-- Add Supplement and Steps Plan History Triggers
-- Created: 2026-02-28
-- Description: Log supplement_plans and steps_plans changes to budget_history
--              (same pattern as nutrition_plans and workout_plans) so all plan
--              changes appear in the budget history list.
-- =====================================================

-- Function to log supplement plan changes
CREATE OR REPLACE FUNCTION log_supplement_plan_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    user_id UUID;
    lead_id_val UUID;
    budget_id_val UUID;
BEGIN
    user_id := auth.uid();
    lead_id_val := COALESCE(NEW.lead_id, OLD.lead_id);
    budget_id_val := COALESCE(NEW.budget_id, OLD.budget_id);

    -- Only log if linked to a budget
    IF budget_id_val IS NULL THEN
        RETURN NULL;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        -- Check if relevant fields changed
        IF (OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.end_date IS DISTINCT FROM NEW.end_date OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.supplements IS DISTINCT FROM NEW.supplements OR
            OLD.is_active IS DISTINCT FROM NEW.is_active) THEN

            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW),
                'entity', 'supplement_plan'
            );

            INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
            VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'supplement_update', changes_json, to_jsonb(NEW));
        END IF;

        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        changes_json := jsonb_build_object(
            'entity', 'supplement_plan'
        );
        INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
        VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'supplement_create', changes_json, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log steps plan changes
CREATE OR REPLACE FUNCTION log_steps_plan_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    user_id UUID;
    lead_id_val UUID;
    budget_id_val UUID;
BEGIN
    user_id := auth.uid();
    lead_id_val := COALESCE(NEW.lead_id, OLD.lead_id);
    budget_id_val := COALESCE(NEW.budget_id, OLD.budget_id);

    -- Only log if linked to a budget
    IF budget_id_val IS NULL THEN
        RETURN NULL;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        -- Check if relevant fields changed
        IF (OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.end_date IS DISTINCT FROM NEW.end_date OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.steps_goal IS DISTINCT FROM NEW.steps_goal OR
            OLD.steps_instructions IS DISTINCT FROM NEW.steps_instructions OR
            OLD.is_active IS DISTINCT FROM NEW.is_active) THEN

            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW),
                'entity', 'steps_plan'
            );

            INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
            VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'steps_update', changes_json, to_jsonb(NEW));
        END IF;

        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        changes_json := jsonb_build_object(
            'entity', 'steps_plan'
        );
        INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
        VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'steps_create', changes_json, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers on supplement_plans
DROP TRIGGER IF EXISTS log_supplement_plan_changes_trigger ON supplement_plans;
CREATE TRIGGER log_supplement_plan_changes_trigger
    AFTER INSERT OR UPDATE ON supplement_plans
    FOR EACH ROW
    EXECUTE FUNCTION log_supplement_plan_changes();

-- Triggers on steps_plans
DROP TRIGGER IF EXISTS log_steps_plan_changes_trigger ON steps_plans;
CREATE TRIGGER log_steps_plan_changes_trigger
    AFTER INSERT OR UPDATE ON steps_plans
    FOR EACH ROW
    EXECUTE FUNCTION log_steps_plan_changes();
