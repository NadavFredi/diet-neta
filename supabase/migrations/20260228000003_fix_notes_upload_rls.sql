-- =====================================================
-- Fix Storage RLS Policies for Notes Folder Uploads
-- Created: 2026-02-28
-- Description: Ensures managers/admins can upload files to notes folder
--              This migration explicitly fixes the RLS policies to allow uploads
--              This is the final migration to ensure it runs after all others
-- =====================================================

-- Only update policies if storage.objects table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' 
    AND table_name = 'objects'
  ) THEN
    -- Ensure the comprehensive manager upload policy exists and is correct
    -- This policy allows managers to upload to ANY folder in client-assets
    DROP POLICY IF EXISTS "Managers can upload all client assets" ON storage.objects;
    
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

    -- Also ensure the view and delete policies are correct
    DROP POLICY IF EXISTS "Managers can view all client assets" ON storage.objects;
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

    DROP POLICY IF EXISTS "Managers can delete all client assets" ON storage.objects;
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

    RAISE NOTICE 'Storage RLS policies for manager uploads fixed successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy update.';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
