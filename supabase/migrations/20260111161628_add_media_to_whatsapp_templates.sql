-- Migration: Add Media Support to WhatsApp Flow Templates
-- Description: Adds media column to store image, video, or GIF URLs
-- Created: 2026-01-11

-- Add media column to whatsapp_flow_templates table
-- Media is stored as JSONB with structure: { type: 'image'|'video'|'gif', url: string }
ALTER TABLE public.whatsapp_flow_templates
ADD COLUMN IF NOT EXISTS media JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.whatsapp_flow_templates.media IS 'Media attachment for template (image, video, or GIF) stored as JSONB: { type: "image"|"video"|"gif", url: string }';

-- Add index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_templates_media 
ON public.whatsapp_flow_templates USING gin(media);
