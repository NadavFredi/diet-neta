-- =====================================================
-- Fix templates folder storage RLS policies
-- Created: 2026-01-20
-- Description: Updates RLS policies for templates folder to use more reliable path matching
--              Replaces storage.foldername(name)[1] with starts_with() for better reliability
-- This migration must be the LAST one in the list for migration up to work correctly
-- =====================================================

-- Only update policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Managers can upload template files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view template files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete template files" ON storage.objects;

    -- RLS Policy: Allow authenticated users (managers/admins) to upload template files
    -- Path structure: templates/{user_id}/{flow_key}/{filename}
    -- Using starts_with() for more reliable path matching
    CREATE POLICY "Managers can upload template files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      name LIKE 'templates/%' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow authenticated users (managers/admins) to view template files
    CREATE POLICY "Managers can view template files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      name LIKE 'templates/%' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow authenticated users (managers/admins) to delete template files
    CREATE POLICY "Managers can delete template files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      name LIKE 'templates/%' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    RAISE NOTICE 'Storage RLS policies for templates folder updated successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy update. Enable storage in config.toml and restart Supabase.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
