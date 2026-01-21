-- =====================================================
-- Create prospero_proposals table
-- Created: 2026-01-27
-- Description: Stores Prospero proposals created via Make.com webhook
--              Status can be "Sent" (when created) or "Signed" (when signed)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prospero_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Foreign keys
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    
    -- Proposal data
    proposal_link TEXT NOT NULL,
    prospero_proposal_id TEXT, -- ID from Prospero if provided
    status TEXT NOT NULL DEFAULT 'Sent' CHECK (status IN ('Sent', 'Signed')),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospero_proposals_lead_id ON public.prospero_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_prospero_proposals_customer_id ON public.prospero_proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_prospero_proposals_status ON public.prospero_proposals(status);
CREATE INDEX IF NOT EXISTS idx_prospero_proposals_created_at ON public.prospero_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospero_proposals_prospero_id ON public.prospero_proposals(prospero_proposal_id);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_prospero_proposals_updated_at
    BEFORE UPDATE ON public.prospero_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.prospero_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to view proposals
CREATE POLICY "Authenticated users can view proposals"
    ON public.prospero_proposals
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert proposals
CREATE POLICY "Authenticated users can insert proposals"
    ON public.prospero_proposals
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update proposals
CREATE POLICY "Authenticated users can update proposals"
    ON public.prospero_proposals
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.prospero_proposals IS 'Stores Prospero proposals created via Make.com webhook integration';
COMMENT ON COLUMN public.prospero_proposals.status IS 'Proposal status: "Sent" when created, "Signed" when signed by customer';
COMMENT ON COLUMN public.prospero_proposals.prospero_proposal_id IS 'Optional Prospero proposal ID if provided by the system';
COMMENT ON COLUMN public.prospero_proposals.metadata IS 'Additional metadata stored as JSON';
