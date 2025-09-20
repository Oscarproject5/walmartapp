-- ====================================================================
-- FIX INVITATION CODE VALIDATION
-- ====================================================================
-- This file fixes the invitation code validation issues
-- Run this in Supabase SQL Editor after the main schema
-- ====================================================================

-- 1. Create the missing invitation validation function
CREATE OR REPLACE FUNCTION public.is_invitation_valid(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitations
    WHERE
      code = invite_code AND
      status = 'active' AND
      (expires_at IS NULL OR expires_at > NOW()) AND
      used_by IS NULL
  );
END;
$$;

-- 2. Create the use_invitation function
CREATE OR REPLACE FUNCTION public.use_invitation(invite_code TEXT, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO invite_record FROM public.invitations
  WHERE code = invite_code AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW());

  IF invite_record.id IS NULL OR invite_record.used_by IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.invitations
  SET
    used_by = user_id,
    used_at = NOW(),
    status = 'used'
  WHERE id = invite_record.id;

  IF invite_record.is_admin THEN
    UPDATE public.profiles
    SET is_admin = TRUE
    WHERE id = user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- 3. CRITICAL: Add RLS policy to allow anonymous users to validate invitation codes
CREATE POLICY "Anyone can validate invitation codes"
ON public.invitations FOR SELECT
TO anon
USING (
  status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW())
  AND used_by IS NULL
);

-- 4. Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.is_invitation_valid(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_invitation(TEXT, UUID) TO anon, authenticated;

-- 5. Ensure the FIRSTADMIN invitation exists and is active
INSERT INTO public.invitations (
    code,
    is_admin,
    status
) VALUES (
    'FIRSTADMIN',
    true,
    'active'
) ON CONFLICT (code)
DO UPDATE SET
    status = 'active',
    used_by = NULL,
    used_at = NULL,
    is_admin = true;

-- 6. Verify the invitation is ready to use
SELECT
    code,
    status,
    is_admin,
    CASE
        WHEN used_by IS NULL THEN 'Available'
        ELSE 'Already Used'
    END as availability,
    expires_at
FROM public.invitations
WHERE code = 'FIRSTADMIN';

-- 7. Test the validation function
SELECT public.is_invitation_valid('FIRSTADMIN') as is_valid;

-- ====================================================================
-- EXPECTED OUTPUT:
-- - The last query should return: is_valid = true
-- - The invitation should show: status = 'active', availability = 'Available'
--
-- USAGE:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Go to your signup page
-- 3. Enter 'FIRSTADMIN' as the invitation code
-- 4. Complete registration - you'll be the admin
-- ====================================================================