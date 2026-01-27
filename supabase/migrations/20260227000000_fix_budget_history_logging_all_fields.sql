-- =====================================================
-- Fix Budget History Logging - Ensure All Fields Are Logged
-- Created: 2026-02-27
-- Description: 
-- 1. Recreate log_budget_changes() function to ensure ALL budget fields are tracked
-- 2. Ensure trigger is properly set up and firing
-- 3. Make sure lead_id is captured correctly
-- 4. Log ALL changes including: name, description, nutrition, workouts, steps, supplements, cardio, intervals, eating rules
-- =====================================================

-- Drop and recreate the function to ensure it's up to date
DROP FUNCTION IF EXISTS log_budget_changes() CASCADE;

CREATE OR REPLACE FUNCTION log_budget_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    user_id UUID;
    lead_id_val UUID;
BEGIN
    -- Get current user ID
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
        -- We check EVERY field that can be modified in the action plan
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
            
            -- Build changes object with old and new values
            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            );
            
            -- Insert into budget_history
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS log_budget_changes_trigger ON budgets;

-- Create the trigger
CREATE TRIGGER log_budget_changes_trigger
    AFTER INSERT OR UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION log_budget_changes();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_budget_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION log_budget_changes() TO service_role;

-- Ensure RLS allows the trigger function to insert
-- The function uses SECURITY DEFINER, but we need to make sure it can insert
-- Drop existing INSERT policy if it exists and create a new one
DROP POLICY IF EXISTS "Allow trigger to insert budget history" ON budget_history;
CREATE POLICY "Allow trigger to insert budget history"
    ON budget_history FOR INSERT
    WITH CHECK (true); -- Allow all inserts (the function will handle security)

-- Also ensure the function owner can insert
ALTER FUNCTION log_budget_changes() OWNER TO postgres;

-- =====================================================
-- Verify trigger exists
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_budget_changes_trigger' 
        AND tgrelid = 'budgets'::regclass
    ) THEN
        RAISE EXCEPTION 'Trigger log_budget_changes_trigger was not created successfully';
    END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
