# User Profiles Migration Guide

This guide explains how to add user profile functionality to your Walmart App using Supabase.

## Migration Steps

1. **Run the Migration Script**

   - Navigate to the Supabase dashboard for your project
   - Go to the SQL Editor
   - Create a new query
   - Copy and paste the entire contents of the `users-table-migration.sql` file
   - Click "Run" to execute the SQL commands

2. **Set Up Storage for Profile Images**

   - In the Supabase dashboard, go to "Storage"
   - Create a new bucket called `user-content`
   - In the bucket settings, set the following:
     - Public bucket: YES
     - File size limit: 5MB (or your preferred limit for profile pictures)
   - Create a policy to allow authenticated users to upload and read files:
     
   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Allow authenticated users to upload files"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'user-content' AND (storage.foldername(name))[1] = 'profile-images');
   
   -- Allow public access to read profile images
   CREATE POLICY "Allow public to read profile images"
   ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'user-content' AND (storage.foldername(name))[1] = 'profile-images');
   ```

3. **Update Your Type Definitions**
   
   The User type should now be properly defined in your application. Make sure the `app/lib/types.ts` file includes the User type definition.

## Schema Details

The `users` table includes:

- **Basic Information**: Email, first name, last name, phone
- **Business Details**: Company name, business type, tax ID, seller IDs
- **Address Information**: Full address details including country
- **Account Management**: Profile image URL and timestamps

## Row Level Security

The migration adds appropriate Row Level Security (RLS) policies to ensure:

- Users can only view and edit their own profiles
- Authentication and profile creation are synced

## Troubleshooting

- If you encounter any errors with the migration, check the SQL editor error output.
- If users are not being created automatically when they sign up, verify that the trigger is properly set up.
- For storage issues, check the storage policies to ensure they're correctly configured.

## Usage in Your Application

The user profile is set up to work with the `/profile` page in your application. When users sign up through Supabase Auth, a corresponding profile will be automatically created in the `users` table.

User profiles are linked to Supabase Auth accounts via the `auth_id` field, which matches the `id` field in the Auth users table. 