-- =====================================================
-- Add Nutrition and Supplements History to Leads Table
-- Created: 2024-01-02
-- Description: Add nutrition_history and supplements_history JSONB columns
--              to store historical nutrition plans and supplements plans
-- =====================================================

-- Add nutrition_history column to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS nutrition_history JSONB DEFAULT '[]'::jsonb;

-- Add supplements_history column to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS supplements_history JSONB DEFAULT '[]'::jsonb;

-- Create GIN indexes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_leads_nutrition_history ON public.leads USING GIN (nutrition_history);
CREATE INDEX IF NOT EXISTS idx_leads_supplements_history ON public.leads USING GIN (supplements_history);

-- Add comments for documentation
COMMENT ON COLUMN public.leads.nutrition_history IS 'Array of historical nutrition plans for this lead';
COMMENT ON COLUMN public.leads.supplements_history IS 'Array of historical supplements plans for this lead';

-- =====================================================
-- Migration Complete
-- =====================================================


