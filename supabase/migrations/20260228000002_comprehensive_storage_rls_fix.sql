-- =====================================================
-- Comprehensive Fix for Storage RLS Policies (All Client Assets)
-- Created: 2026-01-28
-- Description: Updates RLS policies for ALL folders in client-assets bucket
--              to allow managers/admins to upload and manage files.
--              This migration is added to the end of the list to ensure it works.
-- =====================================================

-- Only update policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- Drop ALL fragmented manager policies to avoid conflicts and ensure clean state
    DROP POLICY IF EXISTS "Managers can upload progress photos" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view all progress photos" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete progress photos" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can upload client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view all client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete all client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can upload blood tests" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view all blood tests" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete all blood tests" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can upload workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete workout exercise media" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can upload template files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view template files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete template files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can upload all client assets" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view all client assets" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can update all client assets" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete all client assets" ON storage.objects;

    -- 1. COMPREHENSIVE MANAGER INSERT POLICY
    -- Allows managers/admins to upload to ANY folder in client-assets
    CREATE POLICY "Managers can upload all client assets"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- 2. COMPREHENSIVE MANAGER SELECT POLICY
    -- Allows managers/admins to view ALL files in client-assets
    CREATE POLICY "Managers can view all client assets"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- 3. COMPREHENSIVE MANAGER UPDATE POLICY
    -- Allows managers/admins to update ALL files in client-assets
    CREATE POLICY "Managers can update all client assets"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- 4. COMPREHENSIVE MANAGER DELETE POLICY
    -- Allows managers/admins to delete ALL files in client-assets
    CREATE POLICY "Managers can delete all client assets"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    RAISE NOTICE 'Comprehensive Storage RLS policies for managers updated successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy update.';
  END IF;
END $$;
