-- =====================================================
-- Fix Plans Name and History Migration
-- Created: 2026-02-06
-- Description: 
-- 1. Add name column to nutrition_plans and workout_plans
-- 2. Add lead_id to budget_history
-- 3. Create triggers to log plan changes to budget_history
-- =====================================================

-- 1. Add name column to plans
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Add lead_id to budget_history
ALTER TABLE budget_history ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_budget_history_lead_id ON budget_history(lead_id);

-- 3. Create logging functions for plans

-- Function to log nutrition plan changes
CREATE OR REPLACE FUNCTION log_nutrition_plan_changes()
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
        IF (OLD.targets IS DISTINCT FROM NEW.targets OR
            OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.name IS DISTINCT FROM NEW.name OR
            OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
            
            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW),
                'entity', 'nutrition_plan'
            );
            
            INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
            VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'nutrition_update', changes_json, to_jsonb(NEW));
        END IF;
        
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        changes_json := jsonb_build_object(
            'entity', 'nutrition_plan'
        );
        INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
        VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'nutrition_create', changes_json, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log workout plan changes
CREATE OR REPLACE FUNCTION log_workout_plan_changes()
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
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.name IS DISTINCT FROM NEW.name OR
            OLD.strength IS DISTINCT FROM NEW.strength OR
            OLD.cardio IS DISTINCT FROM NEW.cardio OR
            OLD.intervals IS DISTINCT FROM NEW.intervals OR
            OLD.custom_attributes IS DISTINCT FROM NEW.custom_attributes OR
            OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
            
            changes_json := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW),
                'entity', 'workout_plan'
            );
            
            INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
            VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'workout_update', changes_json, to_jsonb(NEW));
        END IF;
        
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        changes_json := jsonb_build_object(
            'entity', 'workout_plan'
        );
        INSERT INTO budget_history (budget_id, lead_id, changed_at, changed_by, change_type, changes, snapshot)
        VALUES (budget_id_val, lead_id_val, NOW(), user_id, 'workout_create', changes_json, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS log_nutrition_plan_changes_trigger ON nutrition_plans;
CREATE TRIGGER log_nutrition_plan_changes_trigger
    AFTER INSERT OR UPDATE ON nutrition_plans
    FOR EACH ROW
    EXECUTE FUNCTION log_nutrition_plan_changes();

DROP TRIGGER IF EXISTS log_workout_plan_changes_trigger ON workout_plans;
CREATE TRIGGER log_workout_plan_changes_trigger
    AFTER INSERT OR UPDATE ON workout_plans
    FOR EACH ROW
    EXECUTE FUNCTION log_workout_plan_changes();
