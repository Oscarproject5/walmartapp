-- ====================================================================
-- FIX ADMIN PROFILE AFTER SIGNUP
-- ====================================================================
-- This file ensures the first user has admin privileges
-- Run this in Supabase SQL Editor after signing up
-- ====================================================================

-- 1. Check current state of profiles and users
SELECT
    'Checking existing profiles...' as step;

SELECT
    p.id,
    p.is_admin,
    p.created_at,
    'Profile exists' as status
FROM public.profiles p;

-- 2. Check auth users
SELECT
    'Checking auth users...' as step;

SELECT
    u.id,
    u.email,
    u.created_at,
    CASE
        WHEN p.id IS NULL THEN 'No profile'
        WHEN p.is_admin = true THEN 'Admin'
        ELSE 'Regular user'
    END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- 3. Check invitation usage
SELECT
    'Checking invitation status...' as step;

SELECT
    code,
    is_admin as should_be_admin,
    status,
    CASE
        WHEN used_by IS NULL THEN 'Not used'
        ELSE 'Used by: ' || used_by::text
    END as usage_status
FROM public.invitations
WHERE code = 'FIRSTADMIN';

-- 4. Create missing profiles for all auth users
SELECT
    'Creating missing profiles...' as step;

INSERT INTO public.profiles (id, is_admin, created_at, updated_at)
SELECT
    u.id,
    -- First user or FIRSTADMIN invitation user becomes admin
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin = true) THEN true
        WHEN u.id = (SELECT used_by FROM public.invitations WHERE code = 'FIRSTADMIN') THEN true
        ELSE false
    END as is_admin,
    NOW(),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 5. Fix admin status for the first user (if no admin exists)
SELECT
    'Ensuring at least one admin exists...' as step;

-- If no admin exists, make the first user an admin
DO $$
DECLARE
    admin_count INTEGER;
    first_user_id UUID;
BEGIN
    -- Count existing admins
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE is_admin = true;

    -- If no admin exists
    IF admin_count = 0 THEN
        -- Get the first user (by creation date)
        SELECT id INTO first_user_id
        FROM auth.users
        ORDER BY created_at ASC
        LIMIT 1;

        -- Make them admin
        IF first_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET is_admin = true, updated_at = NOW()
            WHERE id = first_user_id;

            RAISE NOTICE 'Made user % an admin', first_user_id;
        END IF;
    END IF;
END $$;

-- 6. Fix admin status for user who used FIRSTADMIN code
SELECT
    'Fixing admin status for FIRSTADMIN invitation user...' as step;

UPDATE public.profiles p
SET is_admin = true, updated_at = NOW()
FROM public.invitations i
WHERE i.code = 'FIRSTADMIN'
    AND i.used_by IS NOT NULL
    AND p.id = i.used_by
    AND p.is_admin = false;

-- 7. Create trigger to auto-create profiles for future signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
    invitation_record RECORD;
BEGIN
    -- Check if user used an invitation
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE used_by = NEW.id
    LIMIT 1;

    -- Count existing admins
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE is_admin = true;

    -- Create profile
    INSERT INTO public.profiles (id, is_admin, created_at, updated_at)
    VALUES (
        NEW.id,
        -- Admin if: first user OR used admin invitation
        (admin_count = 0) OR (invitation_record.is_admin = true),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET is_admin = EXCLUDED.is_admin
    WHERE profiles.is_admin = false; -- Only upgrade to admin, never downgrade

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Ensure trigger exists for future signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 9. Final verification
SELECT
    'Final verification...' as step;

SELECT
    p.id,
    p.is_admin,
    u.email,
    p.created_at as profile_created,
    p.updated_at as last_updated,
    CASE
        WHEN p.is_admin = true THEN '✓ Admin'
        ELSE '✗ Regular User'
    END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at ASC;

-- 10. Show summary
SELECT
    'Summary:' as info,
    COUNT(*) FILTER (WHERE is_admin = true) as admin_count,
    COUNT(*) FILTER (WHERE is_admin = false) as regular_user_count,
    COUNT(*) as total_users
FROM public.profiles;

-- ====================================================================
-- EXPECTED RESULT:
-- - At least one user should have is_admin = true
-- - The first user or FIRSTADMIN invitation user should be admin
-- - All auth users should have corresponding profiles
--
-- IF STILL NO ADMIN:
-- Manually run: UPDATE public.profiles SET is_admin = true WHERE id = 'your-user-id';
-- ====================================================================