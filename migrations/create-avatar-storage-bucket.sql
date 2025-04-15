-- Migration: Create avatars storage bucket with proper permissions
-- Run this in the Supabase SQL Editor to set up the storage properly

-- Step 1: Check if 'avatars' bucket exists, create if not
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'avatars'
    ) INTO bucket_exists;

    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true);
        
        RAISE NOTICE 'Created avatars bucket';
    ELSE
        RAISE NOTICE 'Avatars bucket already exists';
    END IF;
END
$$;

-- Step 2: Create RLS policies for the avatars bucket
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Policy for public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for authenticated users to upload avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = 'profile-images'
    AND position(auth.uid()::text in name) > 0
);

-- Policy for authenticated users to update their avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND position(auth.uid()::text in name) > 0
)
WITH CHECK (
    bucket_id = 'avatars'
    AND position(auth.uid()::text in name) > 0
);

-- Policy for authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND position(auth.uid()::text in name) > 0
);

-- Step 3: Enable Row Level Security on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 4: Update profiles table to ensure it has profile_image_url column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN profile_image_url TEXT;
        
        RAISE NOTICE 'Added profile_image_url column to profiles table';
    ELSE
        RAISE NOTICE 'profile_image_url column already exists in profiles table';
    END IF;
END
$$; 