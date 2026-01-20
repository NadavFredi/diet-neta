-- =====================================================
-- Add Storage Policies for Knowledge Base
-- Created: 2026-01-23
-- Description: RLS policies for knowledge-base folder in client-assets bucket
--              Managers can upload/view/delete, clients can view published articles' media
-- =====================================================

-- Add RLS policies for knowledge-base folder if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- RLS Policy: Allow managers/admins to upload knowledge base files (images/videos)
    DROP POLICY IF EXISTS "Managers can upload knowledge base files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can upload knowledge base files"
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
      (storage.foldername(name))[1] = ''knowledge-base''
    )';

    -- RLS Policy: Allow managers/admins to view all knowledge base files
    DROP POLICY IF EXISTS "Managers can view knowledge base files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can view knowledge base files"
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
      (storage.foldername(name))[1] = ''knowledge-base''
    )';

    -- RLS Policy: Allow managers/admins to delete knowledge base files
    DROP POLICY IF EXISTS "Managers can delete knowledge base files" ON storage.objects;
    EXECUTE '
    CREATE POLICY "Managers can delete knowledge base files"
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
      (storage.foldername(name))[1] = ''knowledge-base''
    )';

    -- Note: Clients access knowledge base files via signed URLs stored in the database
    -- Signed URLs are generated with 1-year expiration and don't require direct storage access
    -- Therefore, no separate policy is needed for clients to view files

    RAISE NOTICE 'Storage RLS policies for knowledge-base folder created successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy creation. Enable storage in config.toml and restart Supabase to create policies.';
  END IF;
END $$;
