-- =====================================================
-- Add Status Field to Subscription Types
-- Created: 2026-01-28
-- Description: Adds status column to subscription_types table
--              Allows tracking subscription type status (Active/Inactive)
--              Defaults to 'פעיל' (Active) for backward compatibility
-- =====================================================

SET search_path TO public;

-- Add status column to subscription_types table
ALTER TABLE public.subscription_types 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'פעיל' NOT NULL;

-- Create index for status column for filtering
CREATE INDEX IF NOT EXISTS idx_subscription_types_status ON public.subscription_types(status) WHERE status IS NOT NULL;

-- Add comment for status column
COMMENT ON COLUMN public.subscription_types.status IS 'Subscription type status: פעיל (Active) or לא פעיל (Inactive)';

-- =====================================================
-- Migration Complete
-- =====================================================
