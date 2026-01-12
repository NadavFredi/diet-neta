-- =====================================================
-- Create client-assets storage bucket with RLS policies
-- Created: 2026-01-04
-- Description: Storage bucket for progress photos and note attachments
-- Path structure: [client_id]/progress/[file_name] and [client_id]/notes/[file_name]
-- 
-- NOTE: Storage buckets must be created via Supabase Dashboard or CLI.
-- This migration only sets up RLS policies for the 'client-assets' bucket.
-- 
-- To create the bucket:
-- 1. Via Supabase Dashboard: Go to Storage > Create Bucket > Name: "client-assets" > Public: false
-- 2. Via CLI: Use Supabase Management API or create manually in dashboard
-- 
-- The bucket should have:
-- - Name: client-assets
-- - Public: false (private, uses signed URLs)
-- - File size limit: 10MB
-- - Allowed MIME types: image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- 
-- IMPORTANT: Storage must be enabled in supabase/config.toml ([storage] enabled = true)
-- and the bucket must be created before these policies will work.
-- 
-- For local development:
-- 1. Enable storage in supabase/config.toml: [storage] enabled = true
-- 2. Restart Supabase: npx supabase stop && npx supabase start
-- 3. Create the bucket via Supabase Studio (http://localhost:54323) > Storage > Create Bucket
-- 
-- If storage is not enabled locally, this migration will fail. That's expected.
-- The migration will work correctly in production/remote Supabase where storage is enabled.
-- =====================================================

-- Only create policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- RLS Policy: Allow trainees to upload files to their own client_id folder
    DROP POLICY IF EXISTS "Trainees can upload to own client folder" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Trainees can upload to own client folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''client-assets'' AND
      (
        EXISTS (
          SELECT 1 FROM customers
          WHERE customers.id::text = (storage.foldername(name))[1]
          AND customers.user_id = auth.uid()
        ) AND
        (storage.foldername(name))[2] = ''progress''
        OR
        EXISTS (
          SELECT 1 FROM customers
          WHERE customers.id::text = (storage.foldername(name))[1]
          AND customers.user_id = auth.uid()
        ) AND
        (storage.foldername(name))[2] = ''notes''
      )
    )';

    -- RLS Policy: Allow trainees to view files in their own client_id folder
    DROP POLICY IF EXISTS "Trainees can view own client files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Trainees can view own client files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      (
        EXISTS (
          SELECT 1 FROM customers
          WHERE customers.id::text = (storage.foldername(name))[1]
          AND customers.user_id = auth.uid()
        ) AND
        (storage.foldername(name))[2] = ''progress''
        OR
        EXISTS (
          SELECT 1 FROM customers
          WHERE customers.id::text = (storage.foldername(name))[1]
          AND customers.user_id = auth.uid()
        ) AND
        (storage.foldername(name))[2] = ''notes''
      )
    )';

    -- RLS Policy: Allow trainees to delete files from their own client_id folder
    DROP POLICY IF EXISTS "Trainees can delete own client files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Trainees can delete own client files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      (
        EXISTS (
          SELECT 1 FROM customers
          WHERE customers.id::text = (storage.foldername(name))[1]
          AND customers.user_id = auth.uid()
        ) AND
        (storage.foldername(name))[2] = ''progress''
        OR
        EXISTS (
          SELECT 1 FROM customers
          WHERE customers.id::text = (storage.foldername(name))[1]
          AND customers.user_id = auth.uid()
        ) AND
        (storage.foldername(name))[2] = ''notes''
      )
    )';

    -- RLS Policy: Allow managers/admins to upload files for any client
    DROP POLICY IF EXISTS "Managers can upload client files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can upload client files"
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
      (
        (storage.foldername(name))[2] = ''progress'' OR
        (storage.foldername(name))[2] = ''notes''
      )
    )';

    -- RLS Policy: Allow managers/admins to view all client files
    DROP POLICY IF EXISTS "Managers can view all client files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can view all client files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN (''admin'', ''user'')
      )
    )';

    -- RLS Policy: Allow managers/admins to delete all client files
    DROP POLICY IF EXISTS "Managers can delete all client files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can delete all client files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''client-assets'' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN (''admin'', ''user'')
      )
    )';

    RAISE NOTICE 'Storage RLS policies created successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy creation. Enable storage in config.toml and restart Supabase to create policies.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
