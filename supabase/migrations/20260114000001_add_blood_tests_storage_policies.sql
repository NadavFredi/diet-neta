-- =====================================================
-- Add Storage Policies for Blood Tests
-- Created: 2026-01-14
-- Description: Add RLS policies for blood-tests folder in client-assets bucket
-- =====================================================

-- Only create policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- RLS Policy: Allow trainees to upload blood test PDFs to their own client_id folder
    DROP POLICY IF EXISTS "Trainees can upload blood tests to own client folder" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Trainees can upload blood tests to own client folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id::text = (storage.foldername(name))[1]
        AND customers.user_id = auth.uid()
      ) AND
      (storage.foldername(name))[2] = ''blood-tests''
    )';

    -- RLS Policy: Allow trainees to view blood test PDFs in their own client_id folder
    DROP POLICY IF EXISTS "Trainees can view own blood tests" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Trainees can view own blood tests"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id::text = (storage.foldername(name))[1]
        AND customers.user_id = auth.uid()
      ) AND
      (storage.foldername(name))[2] = ''blood-tests''
    )';

    -- RLS Policy: Allow trainees to delete blood test PDFs from their own client_id folder
    DROP POLICY IF EXISTS "Trainees can delete own blood tests" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Trainees can delete own blood tests"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id::text = (storage.foldername(name))[1]
        AND customers.user_id = auth.uid()
      ) AND
      (storage.foldername(name))[2] = ''blood-tests''
    )';

    -- RLS Policy: Allow managers/admins to upload blood test PDFs for any client
    DROP POLICY IF EXISTS "Managers can upload blood tests" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can upload blood tests"
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
      (storage.foldername(name))[2] = ''blood-tests''
    )';

    -- RLS Policy: Allow managers/admins to view all blood test PDFs
    DROP POLICY IF EXISTS "Managers can view all blood tests" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can view all blood tests"
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
      (storage.foldername(name))[2] = ''blood-tests''
    )';

    -- RLS Policy: Allow managers/admins to delete all blood test PDFs
    DROP POLICY IF EXISTS "Managers can delete all blood tests" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can delete all blood tests"
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
      (storage.foldername(name))[2] = ''blood-tests''
    )';

    RAISE NOTICE 'Blood tests storage RLS policies created successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy creation. Enable storage in config.toml and restart Supabase to create policies.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
