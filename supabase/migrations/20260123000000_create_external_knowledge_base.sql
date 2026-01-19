-- =====================================================
-- Create External Knowledge Base Table
-- Created: 2026-01-23
-- Description: External knowledge base for storing articles that clients can view
--              Managers can create articles with titles, content, images, videos, and status (draft/published)
--              Only published articles are visible to clients in their portal
-- =====================================================

-- Create external_knowledge_base table
CREATE TABLE IF NOT EXISTS public.external_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Rich text content/article body
    images TEXT[] DEFAULT '{}', -- Array of image URLs (storage paths or external URLs)
    videos TEXT[] DEFAULT '{}', -- Array of video URLs (storage paths or external URLs)
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_external_kb_status ON public.external_knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_external_kb_created_at ON public.external_knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_kb_title ON public.external_knowledge_base(title);
CREATE INDEX IF NOT EXISTS idx_external_kb_created_by ON public.external_knowledge_base(created_by);
-- Index for filtering published articles (most common query for clients)
CREATE INDEX IF NOT EXISTS idx_external_kb_status_published ON public.external_knowledge_base(status, created_at DESC) 
    WHERE status = 'published';

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_external_kb_updated_at
    BEFORE UPDATE ON public.external_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on external_knowledge_base table
ALTER TABLE public.external_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_knowledge_base

-- Managers (authenticated users) can read all entries (both draft and published)
DROP POLICY IF EXISTS "Managers can read all knowledge base articles" ON public.external_knowledge_base;
CREATE POLICY "Managers can read all knowledge base articles"
    ON public.external_knowledge_base FOR SELECT
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'admin')
        )
    );

-- Clients (authenticated users with customer role) can only read published articles
DROP POLICY IF EXISTS "Clients can read published articles" ON public.external_knowledge_base;
CREATE POLICY "Clients can read published articles"
    ON public.external_knowledge_base FOR SELECT
    USING (
        auth.role() = 'authenticated' AND
        status = 'published' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- Only managers can insert articles
DROP POLICY IF EXISTS "Managers can insert knowledge base articles" ON public.external_knowledge_base;
CREATE POLICY "Managers can insert knowledge base articles"
    ON public.external_knowledge_base FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'admin')
        )
    );

-- Only managers can update articles
DROP POLICY IF EXISTS "Managers can update knowledge base articles" ON public.external_knowledge_base;
CREATE POLICY "Managers can update knowledge base articles"
    ON public.external_knowledge_base FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'admin')
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'admin')
        )
    );

-- Only managers can delete articles
DROP POLICY IF EXISTS "Managers can delete knowledge base articles" ON public.external_knowledge_base;
CREATE POLICY "Managers can delete knowledge base articles"
    ON public.external_knowledge_base FOR DELETE
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('manager', 'admin')
        )
    );

-- Add comments to table
COMMENT ON TABLE public.external_knowledge_base IS 'External knowledge base for storing articles that clients can view. Only published articles are visible to clients.';
COMMENT ON COLUMN public.external_knowledge_base.content IS 'Rich text content/article body';
COMMENT ON COLUMN public.external_knowledge_base.images IS 'Array of image URLs (storage paths or external URLs)';
COMMENT ON COLUMN public.external_knowledge_base.videos IS 'Array of video URLs (storage paths or external URLs)';
COMMENT ON COLUMN public.external_knowledge_base.status IS 'Status of the article: draft (only visible to managers) or published (visible to all clients)';
