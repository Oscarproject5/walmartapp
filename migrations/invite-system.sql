-- Add invitation system to the database

-- Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active', -- active, used, expired, revoked
  CONSTRAINT code_not_empty CHECK (char_length(code) >= 6)
);

-- Index on code for faster lookups
CREATE INDEX IF NOT EXISTS invitations_code_idx ON public.invitations(code);

-- Index on email for looking up invites sent to specific emails
CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations(email);

-- Add RLS for invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Clear out any existing policies first
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
ON public.invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Users can view invitations they created
CREATE POLICY "Users can view their own invitations"
ON public.invitations FOR SELECT
USING (created_by = auth.uid());

-- Admins can insert invitations - Fixed policy for INSERT operations
CREATE POLICY "Admins can insert invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Admins can update invitations
CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
ON public.invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Add is_admin column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Function to check if an invitation code is valid
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

-- Function to use an invitation code
CREATE OR REPLACE FUNCTION public.use_invitation(invite_code TEXT, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record public.invitations%ROWTYPE;
  is_admin_invite BOOLEAN;
BEGIN
  -- Get the invitation
  SELECT * INTO invite_record FROM public.invitations
  WHERE code = invite_code AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW());
  
  -- Check if invitation exists and is not used
  IF invite_record.id IS NULL OR invite_record.used_by IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Record the usage
  UPDATE public.invitations
  SET 
    used_by = user_id,
    used_at = NOW(),
    status = 'used'
  WHERE id = invite_record.id;
  
  -- If this is an admin invitation, update the user's profile
  IF invite_record.is_admin THEN
    UPDATE public.profiles
    SET is_admin = TRUE
    WHERE id = user_id;
  END IF;
  
  RETURN TRUE;
END;
$$; 