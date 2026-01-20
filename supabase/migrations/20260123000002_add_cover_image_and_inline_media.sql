-- =====================================================
-- Add Cover Image and Update Content Structure for Inline Media
-- Created: 2026-01-23
-- Description: Add cover_image field and update content to support inline images/videos
--              Content will be stored as JSONB with blocks structure for flexible media placement
-- =====================================================

-- Add cover_image field
ALTER TABLE public.external_knowledge_base 
ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Change content to JSONB to support structured content with inline media
-- Content structure: { "blocks": [{ "type": "text|image|video", "content": "...", "url": "..." }] }
-- For backward compatibility, we'll migrate existing TEXT content to JSONB format
ALTER TABLE public.external_knowledge_base 
ALTER COLUMN content TYPE JSONB USING 
  CASE 
    WHEN content::text LIKE '{%' THEN content::jsonb
    ELSE jsonb_build_object(
      'blocks', 
      jsonb_build_array(
        jsonb_build_object('type', 'text', 'content', content)
      )
    )
  END;

-- Add index for cover_image queries
CREATE INDEX IF NOT EXISTS idx_external_kb_cover_image ON public.external_knowledge_base(cover_image) 
WHERE cover_image IS NOT NULL;

-- Update comments
COMMENT ON COLUMN public.external_knowledge_base.cover_image IS 'Cover image URL for the article card display';
COMMENT ON COLUMN public.external_knowledge_base.content IS 'JSONB structured content with blocks. Format: { "blocks": [{ "type": "text|image|video", "content": "...", "url": "..." }] }';
COMMENT ON COLUMN public.external_knowledge_base.images IS 'DEPRECATED: Legacy array of image URLs. Use inline media in content blocks instead.';
COMMENT ON COLUMN public.external_knowledge_base.videos IS 'DEPRECATED: Legacy array of video URLs. Use inline media in content blocks instead.';
