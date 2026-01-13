-- =====================================================
-- Create Internal Knowledge Base Table
-- Created: 2026-01-15
-- Description: Internal knowledge base for storing video links and resources
--              For internal usage by staff/managers (NOT customer-related)
-- =====================================================

-- Create internal_knowledge_base table
CREATE TABLE IF NOT EXISTS public.internal_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL, -- Video link (URL only, no storage)
    tags TEXT[] DEFAULT '{}', -- Array of tags for categorization
    duration INTEGER, -- Duration in minutes (optional)
    additional_info JSONB DEFAULT '{}'::jsonb, -- Flexible additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_internal_kb_created_at ON public.internal_knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_kb_tags ON public.internal_knowledge_base USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_internal_kb_title ON public.internal_knowledge_base(title);
CREATE INDEX IF NOT EXISTS idx_internal_kb_created_by ON public.internal_knowledge_base(created_by);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_internal_kb_updated_at
    BEFORE UPDATE ON public.internal_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on internal_knowledge_base table
ALTER TABLE public.internal_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies for internal_knowledge_base
-- Authenticated users (staff/managers) can read all entries
DROP POLICY IF EXISTS "Authenticated users can read knowledge base" ON public.internal_knowledge_base;
CREATE POLICY "Authenticated users can read knowledge base"
    ON public.internal_knowledge_base FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can insert entries
DROP POLICY IF EXISTS "Authenticated users can insert knowledge base" ON public.internal_knowledge_base;
CREATE POLICY "Authenticated users can insert knowledge base"
    ON public.internal_knowledge_base FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update entries
DROP POLICY IF EXISTS "Authenticated users can update knowledge base" ON public.internal_knowledge_base;
CREATE POLICY "Authenticated users can update knowledge base"
    ON public.internal_knowledge_base FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete entries
DROP POLICY IF EXISTS "Authenticated users can delete knowledge base" ON public.internal_knowledge_base;
CREATE POLICY "Authenticated users can delete knowledge base"
    ON public.internal_knowledge_base FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add comment to table
COMMENT ON TABLE public.internal_knowledge_base IS 'Internal knowledge base for storing video links and resources for staff/managers (NOT customer-related)';
COMMENT ON COLUMN public.internal_knowledge_base.video_url IS 'Video link URL (external link, no storage)';
COMMENT ON COLUMN public.internal_knowledge_base.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.internal_knowledge_base.duration IS 'Duration in minutes (optional)';
COMMENT ON COLUMN public.internal_knowledge_base.additional_info IS 'Flexible JSONB field for additional metadata';
