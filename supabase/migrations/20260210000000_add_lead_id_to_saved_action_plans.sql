-- =====================================================
-- Add lead_id to saved_action_plans Migration
-- Created: 2026-02-10
-- Description: Add lead_id column to saved_action_plans to scope saved plans per lead
-- =====================================================

-- Add lead_id column to saved_action_plans
ALTER TABLE saved_action_plans 
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Create index for lead_id
CREATE INDEX IF NOT EXISTS idx_saved_action_plans_lead_id ON saved_action_plans(lead_id);

-- Update RLS policies to allow filtering by lead_id
-- The existing policies already check user_id, so we keep them
-- Users can still view their own saved action plans, but now filtered by lead_id when provided

-- Comments
COMMENT ON COLUMN saved_action_plans.lead_id IS 'Reference to the lead this action plan belongs to. Each lead has its own saved action plans.';
