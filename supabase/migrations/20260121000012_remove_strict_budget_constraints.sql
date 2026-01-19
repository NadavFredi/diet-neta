-- =====================================================
-- Remove Strict Budget Constraints Migration
-- Created: 2026-01-21
-- Description: Removes overly strict unique constraints that prevent plan creation
--              The application already handles deduplication via delete-before-insert logic
-- =====================================================

-- =====================================================
-- STEP 1: Drop all unique constraints on budget_id
-- These constraints are preventing legitimate plan creation
-- =====================================================

-- Drop unique constraints for workout_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS idx_workout_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_workout_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_workout_plans_unique_budget';
  END IF;
END $$;

-- Drop unique constraints for nutrition_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nutrition_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS idx_nutrition_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_nutrition_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_nutrition_plans_unique_budget';
  END IF;
END $$;

-- Drop unique constraints for steps_plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps_plans') THEN
    EXECUTE 'DROP INDEX IF EXISTS idx_steps_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_steps_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_steps_plans_unique_budget';
  END IF;
END $$;

-- Drop unique constraints for supplement_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplement_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS idx_supplement_plans_unique_budget_customer';
    EXECUTE 'DROP INDEX IF EXISTS idx_supplement_plans_unique_budget_lead';
    EXECUTE 'DROP INDEX IF EXISTS idx_supplement_plans_unique_budget';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create non-unique indexes for performance
-- These help with queries but don't prevent inserts
-- =====================================================

-- Create non-unique indexes for workout_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workout_plans_budget_id_perf
    ON workout_plans (budget_id)
    WHERE budget_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workout_plans_budget_customer_perf
    ON workout_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workout_plans_budget_lead_perf
    ON workout_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Create non-unique indexes for nutrition_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nutrition_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_nutrition_plans_budget_id_perf
    ON nutrition_plans (budget_id)
    WHERE budget_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_nutrition_plans_budget_customer_perf
    ON nutrition_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_nutrition_plans_budget_lead_perf
    ON nutrition_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Create non-unique indexes for steps_plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'steps_plans') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_steps_plans_budget_id_perf
    ON steps_plans (budget_id)
    WHERE budget_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_steps_plans_budget_customer_perf
    ON steps_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_steps_plans_budget_lead_perf
    ON steps_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- Create non-unique indexes for supplement_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supplement_plans' 
    AND column_name = 'budget_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_supplement_plans_budget_id_perf
    ON supplement_plans (budget_id)
    WHERE budget_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_supplement_plans_budget_customer_perf
    ON supplement_plans (budget_id, customer_id)
    WHERE budget_id IS NOT NULL AND customer_id IS NOT NULL';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_supplement_plans_budget_lead_perf
    ON supplement_plans (budget_id, lead_id)
    WHERE budget_id IS NOT NULL AND lead_id IS NOT NULL';
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_workout_plans_budget_id_perf') THEN
    EXECUTE 'COMMENT ON INDEX idx_workout_plans_budget_id_perf IS ''Performance index for querying workout plans by budget_id''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_nutrition_plans_budget_id_perf') THEN
    EXECUTE 'COMMENT ON INDEX idx_nutrition_plans_budget_id_perf IS ''Performance index for querying nutrition plans by budget_id''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_steps_plans_budget_id_perf') THEN
    EXECUTE 'COMMENT ON INDEX idx_steps_plans_budget_id_perf IS ''Performance index for querying steps plans by budget_id''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_supplement_plans_budget_id_perf') THEN
    EXECUTE 'COMMENT ON INDEX idx_supplement_plans_budget_id_perf IS ''Performance index for querying supplement plans by budget_id''';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- Note: Deduplication is now handled entirely by application logic
-- in budgetPlanSync.ts which deletes existing plans before inserting new ones
-- =====================================================
