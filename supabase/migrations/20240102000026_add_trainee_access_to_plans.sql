-- Migration: Add Trainee Access to Workout and Nutrition Plans
-- Created: 2024-01-02
-- Description: Allow trainees to access their workout and nutrition plans via customer_id

-- =====================================================
-- 1. UPDATE RLS POLICIES FOR workout_plans (for trainee access)
-- =====================================================

-- Policy: Trainees can view workout plans associated with their customer_id
CREATE POLICY "Trainees can view own workout plans"
  ON workout_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = workout_plans.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. UPDATE RLS POLICIES FOR nutrition_plans (for trainee access)
-- =====================================================

-- Policy: Trainees can view nutrition plans associated with their customer_id
CREATE POLICY "Trainees can view own nutrition plans"
  ON nutrition_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = nutrition_plans.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- =====================================================
-- Migration Complete
-- =====================================================
