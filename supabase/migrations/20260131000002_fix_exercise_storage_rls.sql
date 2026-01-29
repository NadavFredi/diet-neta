-- =====================================================
-- Fix Exercise and Workout Storage RLS Policies
-- Created: 2026-01-22
-- Description: Ensures managers can upload to both workout-exercises and exercises folders
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- Drop existing specific policies to consolidate
    DROP POLICY IF EXISTS "Managers can upload workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete workout exercise media" ON storage.objects;
    
    DROP POLICY IF EXISTS "Managers can upload exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete exercise media" ON storage.objects;

    -- Drop the new policies if they exist (in case migration is re-run)
    DROP POLICY IF EXISTS "Managers can upload exercise assets" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can view exercise assets" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete exercise assets" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can update exercise assets" ON storage.objects;

    -- 1. INSERT: Allow managers/admins to upload
    CREATE POLICY "Managers can upload exercise assets"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      (name LIKE 'workout-exercises/%' OR name LIKE 'exercises/%') AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- 2. SELECT: Allow all authenticated users to view (so trainees can see exercise images in their plans)
    CREATE POLICY "Authenticated users can view exercise assets"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      (name LIKE 'workout-exercises/%' OR name LIKE 'exercises/%')
    );

    -- 3. DELETE: Allow managers/admins to delete
    CREATE POLICY "Managers can delete exercise assets"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      (name LIKE 'workout-exercises/%' OR name LIKE 'exercises/%') AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- 4. UPDATE: Allow managers/admins to update (for upserts)
    CREATE POLICY "Managers can update exercise assets"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      (name LIKE 'workout-exercises/%' OR name LIKE 'exercises/%') AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    RAISE NOTICE 'Exercise storage RLS policies fixed successfully';
  END IF;
END $$;
