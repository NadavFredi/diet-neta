-- =====================================================
-- Add collection_id to payments table
-- Created: 2026-01-25
-- Description: Link payments to collections (optional)
--              Payments can exist without a collection
-- =====================================================

-- Add collection_id column to payments table (nullable - payments can exist without a collection)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_payments_collection_id ON public.payments(collection_id);

-- Add comment
COMMENT ON COLUMN public.payments.collection_id IS 'Optional link to a collection (גבייה). Payments can exist without a collection.';
