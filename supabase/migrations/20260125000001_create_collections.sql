-- =====================================================
-- Create Collections (גבייה) Table
-- Created: 2026-01-25
-- Description: Collections table for tracking payment collections
--              Links to leads and can have multiple payments
-- =====================================================

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    due_date DATE,
    status TEXT NOT NULL CHECK (status IN ('ממתין', 'חלקי', 'הושלם', 'בוטל')) DEFAULT 'ממתין',
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_collections_lead_id ON public.collections(lead_id);
CREATE INDEX IF NOT EXISTS idx_collections_customer_id ON public.collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON public.collections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_due_date ON public.collections(due_date);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on collections table
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
-- Authenticated users can read collections for leads they have access to
DROP POLICY IF EXISTS "Authenticated users can read collections" ON public.collections;
CREATE POLICY "Authenticated users can read collections"
    ON public.collections FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Users can see collections for leads they have access to
            EXISTS (
                SELECT 1 FROM public.leads
                WHERE leads.id = collections.lead_id
            )
            OR
            -- Admins can see all collections
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        )
    );

-- Authenticated users can insert collections
DROP POLICY IF EXISTS "Authenticated users can insert collections" ON public.collections;
CREATE POLICY "Authenticated users can insert collections"
    ON public.collections FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update collections
DROP POLICY IF EXISTS "Authenticated users can update collections" ON public.collections;
CREATE POLICY "Authenticated users can update collections"
    ON public.collections FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete collections
DROP POLICY IF EXISTS "Authenticated users can delete collections" ON public.collections;
CREATE POLICY "Authenticated users can delete collections"
    ON public.collections FOR DELETE
    USING (auth.role() = 'authenticated');

-- Admins have full access to collections
DROP POLICY IF EXISTS "Admins have full access to collections" ON public.collections;
CREATE POLICY "Admins have full access to collections"
    ON public.collections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add comment to table
COMMENT ON TABLE public.collections IS 'Payment collections (גבייה) - groups of payments for a lead';
COMMENT ON COLUMN public.collections.lead_id IS 'Lead this collection belongs to (required)';
COMMENT ON COLUMN public.collections.customer_id IS 'Customer this collection belongs to (derived from lead, optional for direct reference)';
COMMENT ON COLUMN public.collections.total_amount IS 'Total amount expected for this collection';
COMMENT ON COLUMN public.collections.due_date IS 'Due date for the collection';
COMMENT ON COLUMN public.collections.status IS 'Collection status: ממתין (pending), חלקי (partial), הושלם (completed), בוטל (cancelled)';
COMMENT ON COLUMN public.collections.description IS 'Description of the collection';
COMMENT ON COLUMN public.collections.notes IS 'Additional notes about the collection';
