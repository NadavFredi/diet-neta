-- =====================================================
-- Ensure client-assets storage bucket exists with templates folder policies
-- Created: 2026-01-11
-- Description: Ensures the client-assets bucket exists and has RLS policies for templates folder
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Ensure storage bucket exists (idempotent)
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
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
    
    RAISE NOTICE 'Storage bucket "client-assets" ensured successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping bucket creation. Enable storage in config.toml and restart Supabase.';
  END IF;
END $$;

-- Add RLS policies for templates folder if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- RLS Policy: Allow authenticated users (managers/admins) to upload template files
    -- Path structure: templates/{user_id}/{flow_key}/{filename}
    DROP POLICY IF EXISTS "Managers can upload template files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can upload template files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN (''admin'', ''user'')
      ) AND
      (storage.foldername(name))[1] = ''templates''
    )';

    -- RLS Policy: Allow authenticated users (managers/admins) to view template files
    DROP POLICY IF EXISTS "Managers can view template files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can view template files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN (''admin'', ''user'')
      ) AND
      (storage.foldername(name))[1] = ''templates''
    )';

    -- RLS Policy: Allow authenticated users (managers/admins) to delete template files
    DROP POLICY IF EXISTS "Managers can delete template files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can delete template files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN (''admin'', ''user'')
      ) AND
      (storage.foldername(name))[1] = ''templates''
    )';

    RAISE NOTICE 'Storage RLS policies for templates folder created successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy creation. Enable storage in config.toml and restart Supabase to create policies.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
