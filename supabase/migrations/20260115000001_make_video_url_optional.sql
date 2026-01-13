-- =====================================================
-- Make video_url optional in internal_knowledge_base
-- Created: 2026-01-15
-- Description: Allow video_url to be NULL
-- =====================================================

ALTER TABLE public.internal_knowledge_base 
  ALTER COLUMN video_url DROP NOT NULL;
