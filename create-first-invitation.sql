-- ====================================================================
-- CREATE FIRST INVITATION CODE
-- ====================================================================
-- Run this in Supabase SQL Editor to create an invitation code
-- for the first user signup
-- ====================================================================

-- Create an admin invitation code
INSERT INTO public.invitations (
    code,
    is_admin,
    status
) VALUES (
    'FIRSTADMIN',  -- Use this code when signing up
    true,          -- Makes the user an admin
    'active'       -- Code is active and ready to use
);

-- Verify the code was created
SELECT code, is_admin, status
FROM public.invitations
WHERE code = 'FIRSTADMIN';

-- ====================================================================
-- HOW TO USE:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Go to your signup page
-- 3. Enter 'FIRSTADMIN' as the invitation code
-- 4. Complete registration - you'll be an admin
-- ====================================================================