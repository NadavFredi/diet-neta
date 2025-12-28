-- Migration: Add Green API Settings Table
-- Description: Stores Green API credentials in PostgreSQL instead of using Edge Functions
-- Created: 2025-12-28
-- Migration number: 20251228093611 (must be last in sequence)

-- Create settings table for Green API credentials
CREATE TABLE IF NOT EXISTS public.green_api_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_instance TEXT NOT NULL,
    api_token_instance TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.green_api_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read Green API settings (needed to send messages)
CREATE POLICY "Authenticated users can read Green API settings"
    ON public.green_api_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can insert Green API settings
CREATE POLICY "Admins can insert Green API settings"
    ON public.green_api_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Only admins can update Green API settings
CREATE POLICY "Admins can update Green API settings"
    ON public.green_api_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Only admins can delete Green API settings
CREATE POLICY "Admins can delete Green API settings"
    ON public.green_api_settings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger to auto-update updated_at and updated_by
CREATE TRIGGER update_green_api_settings_updated_at
    BEFORE UPDATE ON public.green_api_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to set created_by and updated_by on insert
CREATE OR REPLACE FUNCTION set_green_api_settings_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set user fields
CREATE TRIGGER set_green_api_settings_user_trigger
    BEFORE INSERT OR UPDATE ON public.green_api_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_green_api_settings_user();

-- Add comments
COMMENT ON TABLE public.green_api_settings IS 'Stores Green API credentials for WhatsApp messaging';
COMMENT ON COLUMN public.green_api_settings.id_instance IS 'Green API instance ID';
COMMENT ON COLUMN public.green_api_settings.api_token_instance IS 'Green API token instance';

