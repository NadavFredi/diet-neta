-- Script to insert Green API credentials into the database
-- Usage: Run this SQL in Supabase Studio SQL Editor or via psql
-- Replace 'your_instance_id' and 'your_api_token' with your actual Green API credentials

-- First, delete any existing credentials (if updating)
DELETE FROM public.green_api_settings;

-- Insert new credentials
-- Note: Only admin users can insert due to RLS policies
INSERT INTO public.green_api_settings (id_instance, api_token_instance)
VALUES ('your_instance_id', 'your_api_token');

-- Verify the insert
SELECT id_instance, LEFT(api_token_instance, 10) || '...' as api_token_preview, created_at
FROM public.green_api_settings;

