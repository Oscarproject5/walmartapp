-- Migration to add user isolation to existing data
-- Run this script to modify existing data to work with the new schema

-- Create a default admin user if none exists
-- Replace this UUID with the actual admin user UUID or a function to get it
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the first user from auth.users or create a default UUID
  -- This is a temporary solution - in production you should map users properly
  SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    admin_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Update products table
  ALTER TABLE public.products 
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
  
  -- Update existing products with no user_id
  UPDATE public.products 
  SET user_id = admin_user_id
  WHERE user_id IS NULL;

  -- Update app_settings table
  ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD CONSTRAINT fk_app_settings_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
  
  -- Update existing app_settings with no user_id
  UPDATE public.app_settings 
  SET user_id = admin_user_id
  WHERE user_id IS NULL;
  
  -- Make user_id NOT NULL after migration
  ALTER TABLE public.app_settings 
  ALTER COLUMN user_id SET NOT NULL;

  -- Update sales table
  ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
  
  -- Update existing sales with no user_id
  UPDATE public.sales 
  SET user_id = admin_user_id
  WHERE user_id IS NULL;
  
  -- Make user_id NOT NULL after migration
  ALTER TABLE public.sales 
  ALTER COLUMN user_id SET NOT NULL;

  -- Update canceled_orders table
  ALTER TABLE public.canceled_orders 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD CONSTRAINT fk_canceled_orders_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
  
  -- Update existing canceled_orders with no user_id
  UPDATE public.canceled_orders 
  SET user_id = admin_user_id
  WHERE user_id IS NULL;
  
  -- Make user_id NOT NULL after migration
  ALTER TABLE public.canceled_orders 
  ALTER COLUMN user_id SET NOT NULL;

  -- Update orders table
  -- Update existing orders with no user_id
  UPDATE public.orders 
  SET user_id = admin_user_id
  WHERE user_id IS NULL;
  
  -- Make user_id NOT NULL after migration
  ALTER TABLE public.orders 
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES auth.users(id);

  -- Update ai_recommendations table
  ALTER TABLE public.ai_recommendations 
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD CONSTRAINT fk_ai_recommendations_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
  
  -- Update existing ai_recommendations with no user_id
  UPDATE public.ai_recommendations 
  SET user_id = admin_user_id
  WHERE user_id IS NULL;
  
  -- Make user_id NOT NULL after migration
  ALTER TABLE public.ai_recommendations 
  ALTER COLUMN user_id SET NOT NULL;

  -- Enable RLS on tables if not already enabled
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.canceled_orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

END
$$; 