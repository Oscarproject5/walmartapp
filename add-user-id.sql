-- Add user_id column to the orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Comment for documentation
COMMENT ON COLUMN public.orders.user_id IS 'Identifies which user owns this order';

-- Initialize existing orders with a default user id (replace this with real user ID)
DO $$
DECLARE
  -- Get the first user id from the auth.users table (if you're using Supabase Auth)
  default_user_id UUID;
BEGIN
  -- Try to get a user ID from the auth schema if it exists
  BEGIN
    -- This assumes you have Supabase auth set up with users
    EXECUTE 'SELECT id FROM auth.users LIMIT 1' INTO default_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- If there's an error (like schema doesn't exist), create a fixed UUID
    default_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END;

  -- Update all existing orders with the default user ID
  UPDATE public.orders SET user_id = default_user_id WHERE user_id IS NULL;
END $$; 