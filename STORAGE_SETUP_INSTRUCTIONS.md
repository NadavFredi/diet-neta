# Storage Setup Instructions for Production

## ✅ Migrations Applied
The following migrations have been successfully pushed to your production database:
- `20260104000004_add_check_in_settings_to_saved_views.sql`
- `20260104000005_add_attachment_url_to_customer_notes.sql`
- `20260104000006_create_client_assets_storage_bucket.sql`

The RLS policies for storage have been created successfully.

## 📦 Create Storage Bucket

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xghoqeayrtwgymfafrdm
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** or **"Create bucket"**
4. Configure the bucket:
   - **Name**: `client-assets`
   - **Public**: `false` (unchecked - private bucket)
   - **File size limit**: `10MB` (or leave default)
   - **Allowed MIME types**: Leave empty or add:
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
5. Click **"Create bucket"**

### Option 2: Via Supabase CLI (Alternative)

If you prefer using the CLI, you can use the Supabase Management API or create it manually via the dashboard.

## ✅ Verify Setup

After creating the bucket, you can verify it's working by:

1. **Test Upload** (Client Dashboard):
   - Log in as a trainee/client
   - Navigate to "התקדמות ויזואלית" (Visual Progress) tab
   - Try uploading a progress photo
   - Should see success message and photo appear in gallery

2. **Test Note Attachment** (Manager Dashboard):
   - Log in as a manager/admin
   - Open a lead/customer profile
   - Open the Notes panel
   - Click the paperclip icon in the note input
   - Upload an image or document
   - Should see the attachment appear in the note

3. **Test Progress Gallery** (Manager Dashboard):
   - View a customer's lead profile
   - Scroll to the "התקדמות ויזואלית" (Visual Progress) card
   - Should see all progress photos uploaded by the trainee

## 🔒 Security

The RLS policies ensure:
- **Trainees** can only upload/view/delete files in their own `[customer_id]/progress/` and `[customer_id]/notes/` folders
- **Managers/Admins** can view and manage all client files
- Files are private (not publicly accessible) - signed URLs are used for access

## 🐛 Troubleshooting

If you encounter issues:

1. **403 Forbidden errors**: Check that RLS policies were created correctly
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

2. **Bucket not found**: Ensure the bucket name is exactly `client-assets` (case-sensitive)

3. **Upload fails**: Check file size (max 10MB) and MIME type restrictions

4. **View files fails**: Ensure signed URLs are being generated correctly (1 hour expiry)

## 📝 Next Steps

Once the bucket is created, all file upload features will work automatically:
- ✅ Progress photo uploads (Client Dashboard)
- ✅ Note attachments (Manager Dashboard)
- ✅ Progress gallery viewing (Manager Dashboard)
- ✅ File deletion (both client and manager)

The components are already deployed and ready to use!

