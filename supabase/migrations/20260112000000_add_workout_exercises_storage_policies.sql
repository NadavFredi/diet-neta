-- =====================================================
-- Add Storage Policies for Workout Exercises Media
-- Created: 2026-01-12
-- Description: Adds RLS policies to allow managers/admins to upload and manage
--              images and videos for workout exercises in the client-assets bucket
-- Path structure: workout-exercises/[exercise_id]/[images|videos]/[file_name]
-- =====================================================

-- Only create policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- RLS Policy: Allow managers/admins to upload workout exercise media
    DROP POLICY IF EXISTS "Managers can upload workout exercise media" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can upload workout exercise media"
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
      name LIKE ''workout-exercises/%''
    )';

    -- RLS Policy: Allow managers/admins to view workout exercise media
    DROP POLICY IF EXISTS "Managers can view workout exercise media" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can view workout exercise media"
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
      name LIKE ''workout-exercises/%''
    )';

    -- RLS Policy: Allow managers/admins to delete workout exercise media
    DROP POLICY IF EXISTS "Managers can delete workout exercise media" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can delete workout exercise media"
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
      name LIKE ''workout-exercises/%''
    )';

    RAISE NOTICE 'Workout exercises storage RLS policies created successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy creation. Enable storage in config.toml and restart Supabase to create policies.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
