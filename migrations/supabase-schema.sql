-- Complete Supabase Schema for WalmartApp
-- Run this entire script in the Supabase SQL Editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-----------------------
-- Tables Definition --
-----------------------

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  business_type TEXT,
  tax_id TEXT,
  walmart_seller_id TEXT,
  amazon_seller_id TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  cost_per_item DECIMAL(10, 2) NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'walmart',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sku VARCHAR(50),
  product_sku VARCHAR(50),
  product_name VARCHAR(255),
  image_url TEXT,
  supplier VARCHAR(100),
  product_link TEXT,
  purchase_price DECIMAL(10, 2),
  sales_qty INTEGER DEFAULT 0,
  available_qty INTEGER DEFAULT 0,
  per_qty_price DECIMAL(10, 2),
  stock_value DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  remarks TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_base_cost DECIMAL(10, 2) DEFAULT 5.00,
  label_cost DECIMAL(10, 2) DEFAULT 1.00,
  cancellation_shipping_loss DECIMAL(10, 2) DEFAULT 5.00,
  minimum_profit_margin DECIMAL(10, 2) DEFAULT 10.00,
  auto_reorder_enabled BOOLEAN DEFAULT FALSE,
  auto_price_adjustment_enabled BOOLEAN DEFAULT FALSE,
  openrouter_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id),
  quantity_sold INTEGER NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  shipping_fee_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  walmart_fee DECIMAL(10, 2) DEFAULT 0,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  platform VARCHAR(50) DEFAULT 'walmart',
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  label_cost DECIMAL(10, 2) DEFAULT 0,
  cost_per_unit DECIMAL(10, 2) DEFAULT 0,
  additional_costs DECIMAL(10, 2) DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  net_profit DECIMAL(10, 2) DEFAULT 0,
  profit_margin DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  purchase_order_number TEXT,
  ship_by_date DATE,
  order_number TEXT,
  fulfilled_by TEXT,
  ship_node TEXT,
  ship_node_id TEXT,
  ship_method TEXT,
  carrier_method TEXT,
  item_condition TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  order_id TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  product_name VARCHAR(255),
  order_quantity INTEGER NOT NULL,
  walmart_price_per_unit DECIMAL(10, 2) NOT NULL,
  walmart_shipping_fee_per_unit DECIMAL(10, 2) NOT NULL,
  product_cost_per_unit DECIMAL(10, 2) NOT NULL,
  fulfillment_cost DECIMAL(10, 2) NOT NULL,
  app_settings_id UUID REFERENCES public.app_settings(id),
  walmart_shipping_total DECIMAL(12, 2) GENERATED ALWAYS AS (walmart_shipping_fee_per_unit * order_quantity) STORED,
  walmart_item_total DECIMAL(12, 2) GENERATED ALWAYS AS (walmart_price_per_unit * order_quantity) STORED,
  total_revenue DECIMAL(12, 2) GENERATED ALWAYS AS (walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) STORED,
  walmart_fee DECIMAL(12, 2) GENERATED ALWAYS AS ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08) STORED,
  product_cost_total DECIMAL(12, 2) GENERATED ALWAYS AS (product_cost_per_unit * order_quantity) STORED,
  net_profit DECIMAL(12, 2) GENERATED ALWAYS AS ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) - (product_cost_per_unit * order_quantity) - fulfillment_cost - ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)) STORED,
  roi DECIMAL(6, 2) GENERATED ALWAYS AS (((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) - (product_cost_per_unit * order_quantity) - fulfillment_cost - ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)) / NULLIF((fulfillment_cost + (product_cost_per_unit * order_quantity) + ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)), 0) * 100) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  upload_batch_id VARCHAR(100),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  PRIMARY KEY (order_id, sku)
);

-- Canceled Orders Table
CREATE TABLE IF NOT EXISTS public.canceled_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id),
  cancellation_date TIMESTAMPTZ DEFAULT NOW(),
  cancellation_type VARCHAR(50) DEFAULT 'before_shipping',
  shipping_cost_loss DECIMAL(10, 2) DEFAULT 0,
  product_cost_loss DECIMAL(10, 2) DEFAULT 0,
  total_loss DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- AI Recommendations Table
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id),
  recommendation_type VARCHAR(50) NOT NULL,
  recommendation_text TEXT NOT NULL,
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Create unique constraint on user_id and product_sku
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_sku_key;

ALTER TABLE public.products
ADD CONSTRAINT products_user_id_product_sku_key UNIQUE (user_id, product_sku);

-- Create index on product_sku for performance
CREATE INDEX IF NOT EXISTS products_product_sku_idx ON public.products(product_sku);

-----------------------
-- Storage Buckets   --
-----------------------

-- Create avatars bucket for profile images
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

-----------------------
-- RLS Policies      --
-----------------------

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canceled_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- App settings policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.app_settings;

CREATE POLICY "Users can view their own settings"
ON public.app_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.app_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.app_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Products policies
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "Users can view their own products"
ON public.products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
ON public.products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
ON public.products FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
ON public.products FOR DELETE
USING (auth.uid() = user_id);

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
ON public.orders FOR DELETE
USING (auth.uid() = user_id);

-- Sales policies
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

CREATE POLICY "Users can view their own sales"
ON public.sales FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales"
ON public.sales FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
ON public.sales FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
ON public.sales FOR DELETE
USING (auth.uid() = user_id);

-- Canceled orders policies
DROP POLICY IF EXISTS "Users can view their own canceled orders" ON public.canceled_orders;
DROP POLICY IF EXISTS "Users can insert their own canceled orders" ON public.canceled_orders;
DROP POLICY IF EXISTS "Users can update their own canceled orders" ON public.canceled_orders;

CREATE POLICY "Users can view their own canceled orders"
ON public.canceled_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own canceled orders"
ON public.canceled_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canceled orders"
ON public.canceled_orders FOR UPDATE
USING (auth.uid() = user_id);

-- AI recommendations policies
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users can insert their own recommendations" ON public.ai_recommendations;
DROP POLICY IF EXISTS "Users can update their own recommendations" ON public.ai_recommendations;

CREATE POLICY "Users can view their own recommendations"
ON public.ai_recommendations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations"
ON public.ai_recommendations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
ON public.ai_recommendations FOR UPDATE
USING (auth.uid() = user_id);

-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = 'profile-images'
    AND position(auth.uid()::text in name) > 0
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND position(auth.uid()::text in name) > 0
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND position(auth.uid()::text in name) > 0
);

-----------------------
-- Triggers          --
-----------------------

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.app_settings;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ai_recommendations;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.ai_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-----------------------
-- Default Records   --
-----------------------

-- Create trigger for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  
  INSERT INTO public.app_settings (
    shipping_base_cost,
    label_cost,
    cancellation_shipping_loss,
    minimum_profit_margin,
    auto_reorder_enabled,
    auto_price_adjustment_enabled,
    user_id
  ) VALUES (
    5.00,
    1.00,
    5.00,
    10.00,
    FALSE,
    FALSE,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add function to get batch data for orders
CREATE OR REPLACE FUNCTION public.get_batch_data(user_id_param UUID)
RETURNS TABLE (
  batch_id TEXT,
  batch_name TEXT,
  order_count BIGINT,
  total_revenue NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(o.upload_batch_id, 'Unknown') as batch_id,
    COALESCE('Batch #' || o.upload_batch_id, 'Unknown Batch') as batch_name,
    COUNT(*) as order_count,
    SUM(o.total_revenue) as total_revenue,
    MAX(o.created_at) as created_at
  FROM 
    public.orders o
  WHERE 
    o.user_id = user_id_param
  GROUP BY 
    o.upload_batch_id
  ORDER BY 
    MAX(o.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(id);
CREATE INDEX IF NOT EXISTS app_settings_user_id_idx ON public.app_settings(user_id);
CREATE INDEX IF NOT EXISTS products_user_id_idx ON public.products(user_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_order_date_idx ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS sales_user_id_idx ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS sales_product_id_idx ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS canceled_orders_user_id_idx ON public.canceled_orders(user_id);
CREATE INDEX IF NOT EXISTS canceled_orders_sale_id_idx ON public.canceled_orders(sale_id);
CREATE INDEX IF NOT EXISTS ai_recommendations_user_id_idx ON public.ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS ai_recommendations_product_id_idx ON public.ai_recommendations(product_id);

-- Create existing users' profiles if they don't exist
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users
  LOOP
    -- Insert profile if not exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_rec.id) THEN
      INSERT INTO public.profiles (id) VALUES (user_rec.id);
    END IF;
    
    -- Insert app settings if not exists
    IF NOT EXISTS (SELECT 1 FROM public.app_settings WHERE user_id = user_rec.id) THEN
      INSERT INTO public.app_settings (
        shipping_base_cost,
        label_cost,
        cancellation_shipping_loss,
        minimum_profit_margin,
        auto_reorder_enabled,
        auto_price_adjustment_enabled,
        user_id
      ) VALUES (
        5.00,
        1.00,
        5.00,
        10.00,
        FALSE,
        FALSE,
        user_rec.id
      );
    END IF;
  END LOOP;
END
$$; 