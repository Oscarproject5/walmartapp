-- Users Table Migration Script

-- Create users table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(200),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    profile_image_url TEXT,
    walmart_seller_id VARCHAR(100),
    amazon_seller_id VARCHAR(100),
    tax_id VARCHAR(50),
    business_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see and update their own profile
CREATE POLICY "Users can view their own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = auth_id);

-- Create function to handle user creation on auth.signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample user for development
INSERT INTO public.users (
    email, 
    first_name, 
    last_name, 
    company_name, 
    phone,
    address_line1,
    city,
    state,
    postal_code,
    walmart_seller_id
) VALUES (
    'demo@example.com',
    'Demo',
    'User',
    'Demo Retail LLC',
    '555-123-4567',
    '123 Main St',
    'Anytown',
    'CA',
    '90210',
    'WLMRTDEMO123'
) ON CONFLICT (email) DO NOTHING;

-- Add comment to table for documentation
COMMENT ON TABLE public.users IS 'User profiles for the Walmart App'; 