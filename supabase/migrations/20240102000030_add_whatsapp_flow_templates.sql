-- Migration: Add WhatsApp Flow Templates Table
-- Description: Stores message templates for WhatsApp automation flows
-- Created: 2024-01-02

-- Create whatsapp_flow_templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_key TEXT NOT NULL, -- e.g., 'customer_journey_start', 'intro_questionnaire'
  template_content TEXT NOT NULL DEFAULT '', -- The message template with placeholders
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one template per flow per user
  UNIQUE(user_id, flow_key)
);

-- Add RLS policies
ALTER TABLE public.whatsapp_flow_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON public.whatsapp_flow_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON public.whatsapp_flow_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.whatsapp_flow_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.whatsapp_flow_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_templates_user_flow 
  ON public.whatsapp_flow_templates(user_id, flow_key);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_flow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_whatsapp_flow_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_flow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_flow_templates_updated_at();

-- Add comments
COMMENT ON TABLE public.whatsapp_flow_templates IS 'Stores WhatsApp message templates for automation flows';
COMMENT ON COLUMN public.whatsapp_flow_templates.flow_key IS 'Unique identifier for the flow (e.g., customer_journey_start, intro_questionnaire)';
COMMENT ON COLUMN public.whatsapp_flow_templates.template_content IS 'Message template with placeholders like {{name}}, {{phone}}, etc.';
