-- =====================================================
-- Add other_notes to budgets
-- Created: 2026-02-29
-- Description: Add other notes field for budgets/action plans
-- =====================================================

-- Add other_notes to budgets
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS other_notes TEXT;

-- Add comment
COMMENT ON COLUMN budgets.other_notes IS 'Other notes for the plan';
