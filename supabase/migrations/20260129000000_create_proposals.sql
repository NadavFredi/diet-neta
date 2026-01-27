-- =====================================================
-- Create proposals table
-- Created: 2026-01-29
-- Description: Stores proposals for leads and customers
-- =====================================================

CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Foreign keys
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Proposal data
    title TEXT NOT NULL,
    description TEXT,
    proposal_link TEXT,
    external_proposal_id TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Signed', 'Rejected', 'Expired')),
    
    -- Financial data
    amount NUMERIC(12, 2),
    currency TEXT DEFAULT 'ILS',
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_customer_id ON public.proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON public.proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_external_id ON public.proposals(external_proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_expires_at ON public.proposals(expires_at) WHERE expires_at IS NOT NULL;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to view proposals
CREATE POLICY "Authenticated users can view proposals"
    ON public.proposals
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert proposals
CREATE POLICY "Authenticated users can insert proposals"
    ON public.proposals
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update proposals
CREATE POLICY "Authenticated users can update proposals"
    ON public.proposals
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete proposals
CREATE POLICY "Authenticated users can delete proposals"
    ON public.proposals
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comments
COMMENT ON TABLE public.proposals IS 'Stores proposals for leads and customers';
COMMENT ON COLUMN public.proposals.status IS 'Proposal status: Draft, Sent, Viewed, Signed, Rejected, or Expired';
COMMENT ON COLUMN public.proposals.external_proposal_id IS 'External proposal ID from third-party systems';
COMMENT ON COLUMN public.proposals.metadata IS 'Additional metadata stored as JSON';
