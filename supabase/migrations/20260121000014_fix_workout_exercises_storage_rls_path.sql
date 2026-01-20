-- =====================================================
-- Fix workout-exercises storage RLS policies path matching
-- Created: 2026-01-21
-- Description: Updates RLS policies for workout-exercises folder to use LIKE pattern
--              instead of storage.foldername() for more reliable path matching
--              Path structure: workout-exercises/{exercise_id}/images/{filename} or workout-exercises/{exercise_id}/videos/{filename}
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
    DROP POLICY IF EXISTS "Managers can upload workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete workout exercise media" ON storage.objects;

    -- RLS Policy: Allow managers/admins to upload workout exercise media
    -- Using LIKE pattern for more reliable path matching
    CREATE POLICY "Managers can upload workout exercise media"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      name LIKE 'workout-exercises/%' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow managers/admins to view workout exercise media
    CREATE POLICY "Managers can view workout exercise media"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      name LIKE 'workout-exercises/%' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow managers/admins to delete workout exercise media
    CREATE POLICY "Managers can delete workout exercise media"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      name LIKE 'workout-exercises/%' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    RAISE NOTICE 'Storage RLS policies for workout-exercises folder updated successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy update. Enable storage in config.toml and restart Supabase.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
