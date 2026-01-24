-- =====================================================
-- Update client-assets folder storage RLS policies to include 'avatar' folder
-- Created: 2026-02-05
-- Description: Updates RLS policies to allow uploads to 'avatar' folder
--              Path structure: {customer_id}/{folder}/{filename}
--              Folders: progress, notes, blood-tests, avatar
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
    DROP POLICY IF EXISTS "Trainees can upload to own client folder" ON storage.objects;
    DROP POLICY IF EXISTS "Trainees can view own client files" ON storage.objects;
    DROP POLICY IF EXISTS "Trainees can delete own client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can upload client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can view all client files" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can delete all client files" ON storage.objects;

    -- =====================================================
    -- 1. TRAINEE POLICIES (for own folder)
    -- =====================================================

    -- RLS Policy: Allow trainees to upload files to their own client_id folder
    CREATE POLICY "Trainees can upload to own client folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      (
        name LIKE '%/progress/%' OR
        name LIKE '%/notes/%' OR
        name LIKE '%/blood-tests/%' OR
        name LIKE '%/avatar/%'
      ) AND
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id::text = split_part(name, '/', 1)
        AND customers.user_id = auth.uid()
      )
    );

    -- RLS Policy: Allow trainees to view files in their own client_id folder
    CREATE POLICY "Trainees can view own client files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      (
        name LIKE '%/progress/%' OR
        name LIKE '%/notes/%' OR
        name LIKE '%/blood-tests/%' OR
        name LIKE '%/avatar/%'
      ) AND
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id::text = split_part(name, '/', 1)
        AND customers.user_id = auth.uid()
      )
    );

    -- RLS Policy: Allow trainees to delete files from their own client_id folder
    CREATE POLICY "Trainees can delete own client files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      (
        name LIKE '%/progress/%' OR
        name LIKE '%/notes/%' OR
        name LIKE '%/blood-tests/%' OR
        name LIKE '%/avatar/%'
      ) AND
      EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id::text = split_part(name, '/', 1)
        AND customers.user_id = auth.uid()
      )
    );

    -- =====================================================
    -- 2. MANAGER POLICIES (for all client folders)
    -- =====================================================

    -- RLS Policy: Allow managers/admins to upload client files
    CREATE POLICY "Managers can upload client files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'client-assets' AND
      (
        name LIKE '%/progress/%' OR
        name LIKE '%/notes/%' OR
        name LIKE '%/blood-tests/%' OR
        name LIKE '%/avatar/%'
      ) AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow managers/admins to view all client files
    CREATE POLICY "Managers can view all client files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    -- RLS Policy: Allow managers/admins to delete all client files
    CREATE POLICY "Managers can delete all client files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'client-assets' AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'user')
      )
    );

    RAISE NOTICE 'Storage RLS policies for avatar uploads updated successfully';
  ELSE
    RAISE NOTICE 'Storage schema not available. Skipping RLS policy update.';
  END IF;
END $$;
