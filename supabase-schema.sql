-- Schema for Walmart App Database

-- First ensure users have access to the schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

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
    product_sku VARCHAR(50) UNIQUE,
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

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
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

-- Create function to update stock_value
CREATE OR REPLACE FUNCTION public.update_stock_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.stock_value := NEW.quantity * NEW.cost_per_item;
    NEW.available_qty := NEW.quantity - COALESCE(NEW.sales_qty, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock_value updates
DROP TRIGGER IF EXISTS update_stock_value_trigger ON public.products;
CREATE TRIGGER update_stock_value_trigger
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_value();

-- App Settings (Consolidated Settings Table)
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

-- Enable RLS on app_settings table
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for app_settings
CREATE POLICY "Users can view their own settings" 
ON public.app_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.app_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.app_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" 
ON public.app_settings FOR DELETE 
USING (auth.uid() = user_id);

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

-- Enable RLS on sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sales
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

-- Create function to update product sales_qty
CREATE OR REPLACE FUNCTION public.update_product_sales_qty()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET sales_qty = sales_qty + NEW.quantity_sold
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.products
        SET sales_qty = sales_qty - OLD.quantity_sold + NEW.quantity_sold
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET sales_qty = sales_qty - OLD.quantity_sold
        WHERE id = OLD.product_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sales_qty updates
DROP TRIGGER IF EXISTS update_sales_qty_insert_trigger ON public.sales;
DROP TRIGGER IF EXISTS update_sales_qty_update_trigger ON public.sales;
DROP TRIGGER IF EXISTS update_sales_qty_delete_trigger ON public.sales;

CREATE TRIGGER update_sales_qty_insert_trigger
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_sales_qty();

CREATE TRIGGER update_sales_qty_update_trigger
    AFTER UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_sales_qty();

CREATE TRIGGER update_sales_qty_delete_trigger
    AFTER DELETE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_sales_qty();

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

-- Enable RLS on canceled_orders table
ALTER TABLE public.canceled_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for canceled_orders
CREATE POLICY "Users can view their own canceled orders" 
ON public.canceled_orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own canceled orders" 
ON public.canceled_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canceled orders" 
ON public.canceled_orders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canceled orders" 
ON public.canceled_orders FOR DELETE 
USING (auth.uid() = user_id);

-- Create Orders Table with app_settings connection (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.orders (
    order_id TEXT NOT NULL,
    order_date TIMESTAMPTZ NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    sku VARCHAR(255) NOT NULL REFERENCES public.products(product_sku),
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
    net_profit DECIMAL(12, 2) GENERATED ALWAYS AS (
        (walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) - 
        (product_cost_per_unit * order_quantity) - fulfillment_cost - 
        ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)
    ) STORED,
    roi DECIMAL(6, 2) GENERATED ALWAYS AS (
        (
            (walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) - 
            (product_cost_per_unit * order_quantity) - fulfillment_cost - 
            ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)
        ) / 
        NULLIF((fulfillment_cost + (product_cost_per_unit * order_quantity) + 
        ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)), 0) * 100
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    upload_batch_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    -- Define composite primary key
    PRIMARY KEY (order_id, sku)
);

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
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

-- For existing databases, add the upload_batch_id column to orders table if it doesn't exist
DO $$
BEGIN
    -- Check if upload_batch_id column already exists in orders table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'upload_batch_id'
    ) THEN
        -- Add the upload_batch_id column
        ALTER TABLE public.orders ADD COLUMN upload_batch_id VARCHAR(100);
        
        -- Add an index on the new column
        CREATE INDEX IF NOT EXISTS idx_orders_upload_batch_id ON public.orders(upload_batch_id);
        
        -- Add a comment for documentation
        COMMENT ON COLUMN public.orders.upload_batch_id IS 'Identifies which batch upload this order came from for tracking imports';
    END IF;
    
    -- Check if user_id column already exists in orders table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'user_id'
    ) THEN
        -- Add the user_id column
        ALTER TABLE public.orders ADD COLUMN user_id UUID;
        
        -- Add an index on the new column
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
    END IF;
    
    -- Check if user_id column already exists in products table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'user_id'
    ) THEN
        -- Add the user_id column
        ALTER TABLE public.products ADD COLUMN user_id UUID;
        
        -- Add an index on the new column
        CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
    END IF;
END
$$;

-- Create a trigger to update the updated_at timestamp for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_orders_timestamp ON public.orders;
CREATE TRIGGER trigger_update_orders_timestamp
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- AI Recommendations
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

-- Enable RLS on ai_recommendations table
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_recommendations
CREATE POLICY "Users can view their own AI recommendations" 
ON public.ai_recommendations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI recommendations" 
ON public.ai_recommendations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI recommendations" 
ON public.ai_recommendations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI recommendations" 
ON public.ai_recommendations FOR DELETE 
USING (auth.uid() = user_id);

-- Create a modified view that respects user isolation
CREATE OR REPLACE VIEW public.inventory_view AS
SELECT 
    p.id,
    p.product_sku,
    p.product_name,
    p.quantity as total_quantity,
    p.available_qty,
    p.sales_qty,
    p.cost_per_item,
    p.stock_value,
    p.purchase_date,
    p.status,
    p.user_id
FROM 
    public.products p
WHERE 
    p.status = 'active';

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_products_product_sku ON public.products(product_sku);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_sku ON public.orders(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON public.sales(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_upload_batch_id ON public.orders(upload_batch_id);

-- Add comments for documentation
COMMENT ON TABLE public.products IS 'Stores product inventory information including stock levels, costs, and sales data';
COMMENT ON TABLE public.orders IS 'Stores individual line items for each order. Uses a composite primary key (order_id, sku).';
COMMENT ON COLUMN public.orders.order_id IS 'Order identifier from the source system (e.g., Walmart Order #). Part of the composite primary key.';
COMMENT ON COLUMN public.orders.sku IS 'Product SKU for this line item. Part of the composite primary key.';
COMMENT ON COLUMN public.orders.upload_batch_id IS 'Identifies which batch upload this order came from for tracking imports';
COMMENT ON COLUMN public.orders.user_id IS 'User ID from the authentication system. Required for multi-tenancy.';
COMMENT ON COLUMN public.products.user_id IS 'User ID from the authentication system. Required for multi-tenancy.';
COMMENT ON TABLE public.app_settings IS 'Global application settings including shipping configuration and business rules';
COMMENT ON VIEW public.inventory_view IS 'Comprehensive view of inventory including all product details and calculations';

-- Remove the default insert and replace with a function to create default settings for a user
CREATE OR REPLACE FUNCTION public.create_default_app_settings(user_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_settings_id UUID;
BEGIN
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
        user_id_param
    )
    RETURNING id INTO new_settings_id;
    
    RETURN new_settings_id;
END;
$$;

-- Grant execute privileges on the function
GRANT EXECUTE ON FUNCTION public.create_default_app_settings(UUID) TO authenticated, anon, service_role;

-- Update the set_fulfillment_cost_from_settings function to handle user-specific settings
CREATE OR REPLACE FUNCTION public.set_fulfillment_cost_from_settings()
RETURNS TRIGGER AS $$
DECLARE
    settings_record RECORD;
BEGIN
    -- Only set fulfillment_cost from settings if the incoming value is NULL or 0
    IF NEW.fulfillment_cost IS NULL OR NEW.fulfillment_cost <= 0 THEN
        -- Get the most recent app settings for the user
        SELECT id, shipping_base_cost, label_cost
        INTO settings_record
        FROM public.app_settings
        WHERE user_id = NEW.user_id  -- Add user_id filter
        ORDER BY updated_at DESC
        LIMIT 1;

        -- If no settings exist for the user, create default settings
        IF settings_record IS NULL THEN
            SELECT 
                id, 
                shipping_base_cost, 
                label_cost
            INTO settings_record
            FROM public.app_settings
            WHERE id = public.create_default_app_settings(NEW.user_id);
        END IF;

        -- Set the fulfillment_cost as the sum of shipping_base_cost and label_cost
        NEW.fulfillment_cost := settings_record.shipping_base_cost + settings_record.label_cost;
        -- Also set the app_settings_id reference
        NEW.app_settings_id := settings_record.id;
    ELSE
        -- If a specific fulfillment_cost > 0 was provided, keep it
        -- Still link to the current settings ID for reference
        SELECT id INTO NEW.app_settings_id
        FROM public.app_settings
        WHERE user_id = NEW.user_id  -- Add user_id filter
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with app_settings and fulfillment costs
DO $$
DECLARE
    user_record RECORD;
    settings_id UUID;
    shipping_cost DECIMAL(10,2);
    label_fee DECIMAL(10,2);
BEGIN
    -- Loop through each user that has orders
    FOR user_record IN SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
    LOOP
        -- Get the most recent app settings for this user
        SELECT id, shipping_base_cost, label_cost 
        INTO settings_id, shipping_cost, label_fee
        FROM public.app_settings
        WHERE user_id = user_record.user_id
        ORDER BY updated_at DESC
        LIMIT 1;
        
        -- If no settings exist for this user, create them
        IF settings_id IS NULL THEN
            settings_id := public.create_default_app_settings(user_record.user_id);
            shipping_cost := 5.00;
            label_fee := 1.00;
        END IF;
        
        -- Update app_settings_id for all orders for this user
        UPDATE public.orders
        SET app_settings_id = settings_id
        WHERE user_id = user_record.user_id
        AND app_settings_id IS NULL;
        
        -- Update fulfillment_cost where it's missing or zero
        UPDATE public.orders
        SET fulfillment_cost = shipping_cost + label_fee
        WHERE user_id = user_record.user_id
        AND (fulfillment_cost IS NULL OR fulfillment_cost = 0);
    END LOOP;
END $$;

-- Create batch_analytics view for easy batch management
CREATE OR REPLACE VIEW public.batch_analytics_view AS
SELECT 
    upload_batch_id,
    COUNT(*) AS order_count,
    MIN(created_at) AS created_at,
    user_id,
    SUM(total_revenue) AS total_revenue,
    SUM(net_profit) AS total_profit
FROM 
    public.orders
WHERE
    upload_batch_id IS NOT NULL
GROUP BY 
    upload_batch_id, user_id
ORDER BY 
    MIN(created_at) DESC;

-- Add comment for the new view
COMMENT ON VIEW public.batch_analytics_view IS 'Aggregated view of upload batches with order counts and timestamps';

-- Grant permissions on views
GRANT SELECT ON public.inventory_view TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.batch_analytics_view TO postgres, anon, authenticated, service_role;

-- Create an RPC function to get batch data
CREATE OR REPLACE FUNCTION public.get_batch_data(user_id_param UUID)
RETURNS TABLE(
    upload_batch_id TEXT,
    order_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    total_revenue NUMERIC,
    total_profit NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.upload_batch_id::TEXT,
        COUNT(*)::BIGINT as order_count,
        MIN(o.created_at) as created_at,
        SUM(o.total_revenue)::NUMERIC as total_revenue,
        SUM(o.net_profit)::NUMERIC as total_profit
    FROM 
        public.orders o
    WHERE
        o.upload_batch_id IS NOT NULL
        AND o.user_id = user_id_param
    GROUP BY 
        o.upload_batch_id
    ORDER BY 
        MIN(o.created_at) DESC;
END;
$$;

-- Grant execute privileges on the function
GRANT EXECUTE ON FUNCTION public.get_batch_data(UUID) TO authenticated, anon, service_role; 