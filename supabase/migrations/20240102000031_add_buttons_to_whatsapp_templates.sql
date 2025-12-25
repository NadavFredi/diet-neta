-- Migration: Add buttons support to WhatsApp Flow Templates
-- Description: Adds JSONB column to store interactive buttons for WhatsApp messages
-- Created: 2024-01-02

-- Add buttons column to store interactive buttons array
ALTER TABLE public.whatsapp_flow_templates
ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN public.whatsapp_flow_templates.buttons IS 'Array of interactive buttons: [{"id": "1", "text": "Button Text"}]';

-- Add constraint to ensure buttons array has max 3 items
ALTER TABLE public.whatsapp_flow_templates
ADD CONSTRAINT check_buttons_max_count 
CHECK (jsonb_array_length(COALESCE(buttons, '[]'::jsonb)) <= 3);
