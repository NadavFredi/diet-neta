-- =====================================================
-- Fix Manager Storage Permissions for client-assets bucket
-- Created: 2026-01-26
-- Description: Ensures managers (admin/user roles) can upload/view/delete 
--              photos and blood tests for ANY client
-- =====================================================

-- Only update policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- Drop existing manager policies to recreate them
    DROP POLICY IF EXISTS "Managers can upload client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view all client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete all client files" ON storage.objects;

    -- =====================================================
    -- MANAGER POLICIES (for ALL client folders)
    -- =====================================================

    -- RLS Policy: Allow managers/admins to upload client files to ANY client folder
    -- This policy allows uploads to progress, notes, and blood-tests folders for any customer_id
    CREATE POLICY "Managers can upload client files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      (
        name LIKE '%/progress/%' OR
        name LIKE '%/notes/%' OR
        name LIKE '%/blood-tests/%'
      ) AND
      -- Check if user is a manager/admin (simplified check)
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow managers/admins to view ALL client files
    -- This includes files in any customer_id folder
    CREATE POLICY "Managers can view all client files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      -- Check if user is a manager/admin (simplified check)
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow managers/admins to delete ALL client files
    -- This includes files in any customer_id folder
    CREATE POLICY "Managers can delete all client files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      -- Check if user is a manager/admin (simplified check)
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    RAISE NOTICE 'Manager storage RLS policies updated successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy update.';
  END IF;
END $$;
