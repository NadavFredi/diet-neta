-- =====================================================
-- Ensure Storage Bucket is Private
-- Created: 2026-01-21
-- Description: Ensures the client-assets bucket is private (public = false)
--              This migration ensures all files require signed URLs for access
--              Only admin/worker roles can view all files, regular users can only view their own
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Ensure storage bucket is private (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'buckets'
  ) THEN
    -- Update bucket to ensure it's private (public = false)
    -- This ensures all files require signed URLs for access
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'client-assets' AND public = true;
    
    -- If bucket doesn't exist, create it as private
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'client-assets',
      'client-assets',
      false, -- private bucket (uses signed URLs)
      52428800, -- 50MB file size limit (in bytes) - matches config.toml
      ARRAY[
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false, -- Always ensure private
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
    
    RAISE NOTICE 'Storage bucket "client-assets" is now private (requires signed URLs)';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping bucket update. Enable storage in config.toml and restart Supabase.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
