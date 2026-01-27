-- =====================================================
-- Fix Budget Update RLS
-- Created: 2026-02-06
-- Description: Allow staff to update budgets to ensure history logging works
-- =====================================================

-- Allow managers and coaches to update budgets
-- This is necessary for the budget history trigger to fire when they make changes

DO $$
BEGIN
    -- Check if the policy already exists to avoid errors
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'budgets' 
        AND policyname = 'Staff can update budgets'
    ) THEN
        CREATE POLICY "Staff can update budgets"
            ON budgets FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coach')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coach')
                )
            );
    END IF;
END
$$;
