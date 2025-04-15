-- Function to execute arbitrary SQL (for admins only)
-- This is a security-sensitive function that should only be callable by admins
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only administrators can execute SQL commands';
  END IF;
  
  -- Execute the SQL
  EXECUTE sql_query;
END;
$$; 