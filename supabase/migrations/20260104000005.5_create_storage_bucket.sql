-- =====================================================
-- Create client-assets storage bucket
-- Created: 2026-01-11
-- Description: Creates the client-assets storage bucket if it doesn't exist
-- This migration runs before the RLS policies migration
-- =====================================================

-- Create the storage bucket if it doesn't exist
-- Only create if storage.buckets table exists (storage is enabled)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'buckets'
  ) THEN
    -- Insert bucket if it doesn't exist (idempotent)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'client-assets',
      'client-assets',
      false, -- private bucket (uses signed URLs)
      10485760, -- 10MB file size limit (in bytes)
      ARRAY[
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Storage bucket "client-assets" created successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping bucket creation. Enable storage in config.toml and restart Supabase.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
