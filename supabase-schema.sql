-- Schema for Walmart App Database

-- First ensure users have access to the schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- Products Table (Modified for Aggregation)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0, -- Now represents total purchased quantity across batches
    cost_per_item DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Now represents weighted average cost
    purchase_date TIMESTAMPTZ DEFAULT NOW(), -- Now represents first purchase date
    source VARCHAR(50) DEFAULT 'walmart', -- Might also vary per batch, keep as default?
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sku VARCHAR(50), -- Keep for reference?
    product_sku VARCHAR(50), -- This is the key identifier
    product_name VARCHAR(255), -- Keep as primary display name
    image_url TEXT,
    supplier VARCHAR(100), -- Might vary per batch, keep as default/primary?
    product_link TEXT,
    purchase_price DECIMAL(10, 2), -- Remove? Cost is per batch now. Let's remove.
    sales_qty INTEGER DEFAULT 0, -- Calculated: sum(batch.purchased - batch.available)
    available_qty INTEGER DEFAULT 0, -- Calculated: sum(batch.available)
    per_qty_price DECIMAL(10, 2), -- Remove? Cost is per batch. Let's remove.
    stock_value DECIMAL(10, 2), -- Calculated: sum(batch.available * batch.cost)
    status VARCHAR(50) DEFAULT 'active',
    remarks TEXT,
    user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Add composite unique constraint for user_id and product_sku
ALTER TABLE public.products ADD CONSTRAINT products_user_id_product_sku_key UNIQUE (user_id, product_sku);

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
    sku VARCHAR(255) NOT NULL, -- References products.product_sku
    product_name VARCHAR(255),
    order_quantity INTEGER NOT NULL,
    walmart_price_per_unit DECIMAL(10, 2) NOT NULL,
    walmart_shipping_fee_per_unit DECIMAL(10, 2) NOT NULL,
    product_cost_per_unit DECIMAL(10, 2) NOT NULL, -- Will be calculated by trigger using FIFO avg cost for the order
    fulfillment_cost DECIMAL(10, 2) NOT NULL, -- Calculated by trigger
    app_settings_id UUID REFERENCES public.app_settings(id),
    walmart_shipping_total DECIMAL(12, 2),
    walmart_item_total DECIMAL(12, 2),
    total_revenue DECIMAL(12, 2),
    walmart_fee DECIMAL(12, 2),
    product_cost_total DECIMAL(12, 2), -- Total cost of goods sold for this order line (from FIFO)
    net_profit DECIMAL(12, 2),
    roi DECIMAL(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    upload_batch_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    PRIMARY KEY (order_id, sku)
);

-- Add foreign key constraint to reference products using composite key
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_sku_fkey
FOREIGN KEY (user_id, sku) REFERENCES products(user_id, product_sku);

-- Create a non-unique index on product_sku for performance
CREATE INDEX IF NOT EXISTS products_product_sku_idx ON products(product_sku);

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
    p.quantity as total_purchased_quantity, -- Renamed for clarity
    p.available_qty,
    p.sales_qty,
    p.cost_per_item as average_cost_per_item, -- Renamed for clarity
    p.stock_value,
    p.purchase_date as first_purchase_date, -- Renamed for clarity
    p.status,
    p.user_id
FROM
    public.products p
WHERE
    p.status != 'inactive'; -- Show active, out_of_stock, low_stock etc.

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_products_product_sku ON public.products(product_sku);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_sku ON public.orders(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON public.sales(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_upload_batch_id ON public.orders(upload_batch_id);

-- Add comments for documentation
COMMENT ON TABLE public.products IS 'Stores aggregated/summary product inventory information derived from product_batches.';
COMMENT ON COLUMN public.products.quantity IS 'Total quantity purchased across all batches (updated by trigger).';
COMMENT ON COLUMN public.products.cost_per_item IS 'Weighted average cost per item based on available batches (updated by trigger).';
COMMENT ON COLUMN public.products.purchase_date IS 'Date of the first purchase batch for this product.';
COMMENT ON COLUMN public.products.sales_qty IS 'Total quantity sold across all batches (calculated as total purchased - total available, updated by trigger).';
COMMENT ON COLUMN public.products.available_qty IS 'Total quantity currently available across all batches (sum of product_batches.quantity_available, updated by trigger).';
COMMENT ON COLUMN public.products.stock_value IS 'Total value of available stock across all batches (sum of product_batches.quantity_available * product_batches.cost_per_item, updated by trigger).';
COMMENT ON TABLE public.orders IS 'Stores individual line items for each order. Uses a composite primary key (order_id, sku).';
COMMENT ON COLUMN public.orders.order_id IS 'Order identifier from the source system (e.g., Walmart Order #). Part of the composite primary key.';
COMMENT ON COLUMN public.orders.sku IS 'Product SKU for this line item. Part of the composite primary key.';
COMMENT ON COLUMN public.orders.upload_batch_id IS 'Identifies which batch upload this order came from for tracking imports';
COMMENT ON COLUMN public.orders.user_id IS 'User ID from the authentication system. Required for multi-tenancy.';
COMMENT ON COLUMN public.products.user_id IS 'User ID from the authentication system. Required for multi-tenancy.';
COMMENT ON TABLE public.app_settings IS 'Global application settings including shipping configuration and business rules';
COMMENT ON VIEW public.inventory_view IS 'Comprehensive view of inventory including all product details and calculations';
COMMENT ON COLUMN public.orders.product_cost_per_unit IS 'Average cost per unit for this specific order, calculated via FIFO logic.';
COMMENT ON COLUMN public.orders.product_cost_total IS 'Total cost of goods sold for this order line, calculated via FIFO logic.';

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

-- Create a function to reset product quantities (Adjust if necessary)
-- This function might need adjustment if you want to reset based on batches
-- For now, it resets the main product table aggregates, which might be okay
-- if you intend to repopulate batches separately.
CREATE OR REPLACE FUNCTION public.reset_product_quantities(user_id_param UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- This function now clears the aggregated values.
    -- WARNING: This does NOT delete the underlying product_batches.
    -- You might need a separate function to clear batches if that's the goal.
    IF user_id_param IS NOT NULL THEN
        UPDATE public.products
        SET
            sales_qty = 0,
            available_qty = 0, -- Reset based on assumption batches will be cleared/repopulated
            stock_value = 0,
            quantity = 0, -- Reset total purchased
            cost_per_item = 0 -- Reset average cost
        WHERE user_id = user_id_param;
    ELSE
        -- Admin version (affects all users)
        UPDATE public.products
        SET
            sales_qty = 0,
            available_qty = 0,
            stock_value = 0,
            quantity = 0,
            cost_per_item = 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute privileges on the reset function
GRANT EXECUTE ON FUNCTION public.reset_product_quantities(UUID) TO authenticated, anon, service_role;

-- --- NEW: Product Batches Table (for FIFO tracking) ---
CREATE TABLE IF NOT EXISTS public.product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL, -- Link to the main product entry
    purchase_date TIMESTAMPTZ NOT NULL,
    quantity_purchased INTEGER NOT NULL CHECK (quantity_purchased >= 0),
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    cost_per_item DECIMAL(10, 2) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT quantity_available_le_purchased CHECK (quantity_available <= quantity_purchased) -- Ensure available doesn't exceed purchased
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_user_id_product_id ON public.product_batches(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_purchase_date ON public.product_batches(purchase_date); -- For FIFO ordering

-- Enable RLS
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_batches
CREATE POLICY "Users can view their own product batches"
ON public.product_batches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product batches"
ON public.product_batches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product batches"
ON public.product_batches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product batches"
ON public.product_batches FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON TABLE public.product_batches IS 'Stores individual purchase batches of products for FIFO tracking.';
COMMENT ON COLUMN public.product_batches.quantity_available IS 'The remaining quantity from this specific batch.';
-- --- END NEW: Product Batches Table ---

-- --- NEW: Function to update product aggregates from batches ---
CREATE OR REPLACE FUNCTION public.update_product_aggregates_from_batches()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_total_quantity_available INTEGER;
    v_total_quantity_purchased INTEGER;
    v_total_stock_value DECIMAL(12, 2);
    v_weighted_avg_cost DECIMAL(10, 2);
    v_first_purchase_date TIMESTAMPTZ;
    v_current_status VARCHAR(50);
BEGIN
    -- Determine the product_id affected
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;

    -- Get the current status before recalculating (to avoid overwriting 'inactive')
    SELECT status INTO v_current_status FROM public.products WHERE id = v_product_id;

    -- Recalculate aggregates for the affected product
    SELECT
        COALESCE(SUM(quantity_available), 0),
        COALESCE(SUM(quantity_purchased), 0),
        COALESCE(SUM(quantity_available * cost_per_item), 0),
        MIN(purchase_date)
    INTO
        v_total_quantity_available,
        v_total_quantity_purchased,
        v_total_stock_value,
        v_first_purchase_date
    FROM public.product_batches
    WHERE product_id = v_product_id;

    -- Calculate weighted average cost (avoid division by zero)
    IF v_total_quantity_available > 0 THEN
        v_weighted_avg_cost := v_total_stock_value / v_total_quantity_available;
    ELSE
        -- Keep the last known average cost if available, otherwise 0
        SELECT cost_per_item INTO v_weighted_avg_cost FROM public.products WHERE id = v_product_id;
        IF NOT FOUND OR v_weighted_avg_cost IS NULL THEN
           v_weighted_avg_cost := 0;
        END IF;
    END IF;

    -- Update the products table
    UPDATE public.products
    SET
        available_qty = v_total_quantity_available,
        quantity = v_total_quantity_purchased, -- Total purchased quantity
        sales_qty = v_total_quantity_purchased - v_total_quantity_available, -- Calculated sales quantity
        stock_value = v_total_stock_value,
        cost_per_item = v_weighted_avg_cost, -- Weighted average cost
        purchase_date = v_first_purchase_date, -- Update first purchase date
        -- Update status based on availability, but respect 'inactive' status
        status = CASE
            WHEN v_current_status = 'inactive' THEN 'inactive' -- Don't change inactive status automatically
            WHEN v_total_quantity_available <= 0 THEN 'out_of_stock'
            -- Add logic for 'low_stock' if needed, e.g., based on a threshold
            -- WHEN v_total_quantity_available < 5 THEN 'low_stock'
            ELSE 'active' -- If not inactive and not out of stock, it's active
        END
    WHERE id = v_product_id;

    RETURN NULL; -- Trigger is AFTER, result is ignored
END;
$$ LANGUAGE plpgsql;

-- Create trigger on product_batches to update products table
DROP TRIGGER IF EXISTS trigger_update_product_aggregates ON public.product_batches;
CREATE TRIGGER trigger_update_product_aggregates
    AFTER INSERT OR UPDATE OR DELETE ON public.product_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_aggregates_from_batches();
-- --- END NEW: Function/Trigger for Product Aggregates ---

-- --- NEW: Function to consume inventory via FIFO ---
CREATE OR REPLACE FUNCTION public.consume_product_inventory_fifo(
    p_user_id UUID,
    p_product_sku VARCHAR(50),
    p_quantity_to_consume INTEGER,
    p_order_id TEXT, -- Added parameter
    p_order_sku VARCHAR -- Added parameter (matches product_sku for consistency)
)
RETURNS TABLE(consumed_cost DECIMAL(12, 2), quantity_consumed_total INTEGER) AS $$
DECLARE
    v_product_id UUID;
    v_batch RECORD;
    v_total_cost DECIMAL(12, 2) := 0;
    v_quantity_remaining_to_consume INTEGER := p_quantity_to_consume;
    v_quantity_consumed_from_batch INTEGER;
    v_total_quantity_consumed INTEGER := 0;
    v_total_available INTEGER;
    v_missing_quantity INTEGER;
    v_cost_per_unit DECIMAL(10, 2);
BEGIN
    -- Find the product ID and cost
    SELECT id, cost_per_item INTO v_product_id, v_cost_per_unit
    FROM public.products
    WHERE user_id = p_user_id AND product_sku = p_product_sku;

    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'Product SKU % not found for user %', p_product_sku, p_user_id;
    END IF;

    -- Check available quantity
    SELECT available_qty INTO v_total_available
    FROM public.products
    WHERE id = v_product_id;

    -- Auto-create inventory if needed (optional, keep from previous logic)
    IF v_total_available < p_quantity_to_consume THEN
        v_missing_quantity := p_quantity_to_consume - v_total_available;
        INSERT INTO public.product_batches (
            product_id, purchase_date, quantity_purchased, quantity_available, cost_per_item, user_id
        ) VALUES (
            v_product_id, NOW(), v_missing_quantity, v_missing_quantity, COALESCE(v_cost_per_unit, 0), p_user_id
        );
        RAISE NOTICE 'Auto-created inventory batch for SKU: % (User: %). Added % units.', p_product_sku, p_user_id, v_missing_quantity;
    END IF;

    -- Loop through batches (FIFO)
    FOR v_batch IN
        SELECT id, quantity_available, cost_per_item
        FROM public.product_batches
        WHERE product_id = v_product_id AND quantity_available > 0
        ORDER BY purchase_date ASC
    LOOP
        IF v_quantity_remaining_to_consume <= 0 THEN EXIT; END IF;

        v_quantity_consumed_from_batch := LEAST(v_quantity_remaining_to_consume, v_batch.quantity_available);

        -- Update batch quantity
        UPDATE public.product_batches
        SET quantity_available = quantity_available - v_quantity_consumed_from_batch
        WHERE id = v_batch.id;

        -- *** Record the consumption ***
        INSERT INTO public.order_batch_consumption (
            order_id, order_sku, product_batch_id, quantity_consumed, user_id
        ) VALUES (
            p_order_id, p_order_sku, v_batch.id, v_quantity_consumed_from_batch, p_user_id
        );

        v_total_cost := v_total_cost + (v_quantity_consumed_from_batch * v_batch.cost_per_item);
        v_quantity_remaining_to_consume := v_quantity_remaining_to_consume - v_quantity_consumed_from_batch;
        v_total_quantity_consumed := v_total_quantity_consumed + v_quantity_consumed_from_batch;
    END LOOP;

    IF v_total_quantity_consumed != p_quantity_to_consume THEN
       RAISE EXCEPTION 'Inventory consumption mismatch for SKU %. Required: %, Consumed: %. Potential issue after auto-creation.', 
           p_product_sku, p_quantity_to_consume, v_total_quantity_consumed;
    END IF;

    consumed_cost := v_total_cost;
    quantity_consumed_total := v_total_quantity_consumed;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for the new function signature
GRANT EXECUTE ON FUNCTION public.consume_product_inventory_fifo(UUID, VARCHAR, INTEGER, TEXT, VARCHAR) TO authenticated, service_role;
-- --- END NEW: Function to consume inventory via FIFO ---


-- --- NEW: Trigger function for Order Calculation & Inventory Consumption ---
CREATE OR REPLACE FUNCTION public.calculate_order_financials_and_consume_inventory()
RETURNS TRIGGER AS $$
DECLARE
    settings_record RECORD;
    v_fulfillment_cost DECIMAL(10, 2);
    fifo_result RECORD;
    v_product_cost_total DECIMAL(12, 2);
    v_total_revenue DECIMAL(12, 2);
    v_walmart_fee DECIMAL(12, 2);
    v_net_profit DECIMAL(12, 2);
    v_total_cost_basis DECIMAL(12, 2); -- product_cost + fulfillment + fee
BEGIN
    -- === Step 1: Calculate Fulfillment Cost ===
    IF NEW.fulfillment_cost IS NULL OR NEW.fulfillment_cost <= 0 THEN
        SELECT id, shipping_base_cost, label_cost
        INTO settings_record
        FROM public.app_settings
        WHERE user_id = NEW.user_id
        ORDER BY updated_at DESC
        LIMIT 1;

        IF settings_record IS NULL THEN
             -- Attempt to create default settings for the user
             SELECT id, shipping_base_cost, label_cost INTO settings_record
             FROM public.app_settings
             WHERE id = public.create_default_app_settings(NEW.user_id);

             -- If still null (function failed?), use hardcoded defaults
             IF settings_record IS NULL THEN
                v_fulfillment_cost := 5.00 + 1.00; -- Default base + label
                NEW.app_settings_id := NULL;
             ELSE
                v_fulfillment_cost := settings_record.shipping_base_cost + settings_record.label_cost;
                NEW.app_settings_id := settings_record.id;
             END IF;
        ELSE
            v_fulfillment_cost := settings_record.shipping_base_cost + settings_record.label_cost;
            NEW.app_settings_id := settings_record.id;
        END IF;
        NEW.fulfillment_cost := v_fulfillment_cost;
    ELSE
        v_fulfillment_cost := NEW.fulfillment_cost;
        -- Try to link settings_id even if cost is provided
        SELECT id INTO NEW.app_settings_id
        FROM public.app_settings
        WHERE user_id = NEW.user_id
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;

    -- === Step 2: Consume Inventory using FIFO and get cost ===
    -- This should only happen on INSERT. Updates are complex and risk double-counting/errors.
    -- Handle order updates (quantity change, cancellation) via separate logic/functions if needed.
    IF TG_OP = 'INSERT' THEN
        IF NEW.order_quantity > 0 THEN
            SELECT consumed_cost, quantity_consumed_total
            INTO fifo_result
            FROM public.consume_product_inventory_fifo(NEW.user_id, NEW.sku, NEW.order_quantity, NEW.order_id, NEW.sku);

            -- Check if consumption was successful (should match requested quantity)
            IF fifo_result.quantity_consumed_total IS NULL OR fifo_result.quantity_consumed_total != NEW.order_quantity THEN
                 -- The consume function already raises an exception on failure/mismatch
                 -- This check is an extra safety layer, but the exception from the function should handle it.
                 RAISE EXCEPTION 'Failed to consume required quantity (%) for SKU %. Consumed: %', NEW.order_quantity, NEW.sku, COALESCE(fifo_result.quantity_consumed_total, 0);
            END IF;
            v_product_cost_total := COALESCE(fifo_result.consumed_cost, 0);
        ELSE
             v_product_cost_total := 0; -- No cost if quantity is zero or less
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
         -- ** WARNING: Trigger-based updates for FIFO are complex and error-prone **
         -- If SKU or Quantity changes, stock needs adjustment (return old, consume new).
         -- This logic is often better handled in application layer or specific stored procedures called for updates/cancellations.
         -- For this trigger, we'll just recalculate financials based on potentially updated NEW values,
         -- assuming inventory adjustments are handled elsewhere or not needed for the update type.
         -- We will use the potentially updated NEW.product_cost_total if provided, otherwise recalculate cost per unit.
        IF NEW.product_cost_total IS NOT DISTINCT FROM OLD.product_cost_total THEN
             -- If total cost wasn't changed, recalculate from per_unit if quantity changed
            IF NEW.order_quantity != OLD.order_quantity OR NEW.product_cost_per_unit != OLD.product_cost_per_unit THEN
                 v_product_cost_total := NEW.product_cost_per_unit * NEW.order_quantity;
            ELSE
                v_product_cost_total := NEW.product_cost_total; -- Keep existing if nothing relevant changed
            END IF;
        ELSE
             v_product_cost_total := NEW.product_cost_total; -- Use the updated total cost
        END IF;

    END IF; -- End TG_OP check

    -- === Step 3: Calculate other financial fields ===
    NEW.walmart_item_total := NEW.walmart_price_per_unit * NEW.order_quantity;
    NEW.walmart_shipping_total := NEW.walmart_shipping_fee_per_unit * NEW.order_quantity;
    v_total_revenue := NEW.walmart_item_total + NEW.walmart_shipping_total;
    -- Use a configurable fee or default if settings not found/applicable
    v_walmart_fee := v_total_revenue * 0.08; -- TODO: Consider making fee configurable in app_settings

    NEW.product_cost_total := v_product_cost_total;
    -- Calculate product_cost_per_unit based on total cost from FIFO
     IF NEW.order_quantity > 0 THEN
       NEW.product_cost_per_unit := v_product_cost_total / NEW.order_quantity;
     ELSE
       NEW.product_cost_per_unit := 0;
     END IF;

    -- Calculate Net Profit
    v_net_profit := v_total_revenue - v_product_cost_total - v_fulfillment_cost - v_walmart_fee;

    -- Calculate ROI
    v_total_cost_basis := v_product_cost_total + v_fulfillment_cost + v_walmart_fee;
    IF v_total_cost_basis != 0 THEN -- Avoid division by zero
        NEW.roi := (v_net_profit / v_total_cost_basis) * 100;
    ELSE
        -- Define ROI for zero cost basis (e.g., 0 if profit is 0 or negative, NULL or infinity if profit is positive)
        IF v_net_profit > 0 THEN
           NEW.roi := NULL; -- Or a large number / 'Infinity' representation if needed
        ELSE
           NEW.roi := 0;
        END IF;
    END IF;

    -- Set the calculated fields
    NEW.total_revenue := v_total_revenue;
    NEW.walmart_fee := v_walmart_fee;
    NEW.net_profit := v_net_profit;
    NEW.updated_at = NOW(); -- Update timestamp

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the new trigger for INSERT and UPDATE on orders
DROP TRIGGER IF EXISTS trigger_calculate_order_financials ON public.orders;
CREATE TRIGGER trigger_calculate_order_financials
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_order_financials_and_consume_inventory();
-- --- END NEW: Trigger function for Order Calculation & Inventory Consumption --- 

-- --- NEW: Function to create missing products from order SKUs ---
CREATE OR REPLACE FUNCTION public.ensure_product_exists_for_order() 
RETURNS TRIGGER AS $$
DECLARE
    product_exists BOOLEAN;
    v_product_id UUID;
    v_batch_exists BOOLEAN;
BEGIN
    -- Check if product exists for this SKU and user
    SELECT EXISTS (
        SELECT 1 FROM public.products 
        WHERE product_sku = NEW.sku AND user_id = NEW.user_id
    ) INTO product_exists;
    
    -- If product doesn't exist, create it with sufficient inventory
    IF NOT product_exists THEN
        INSERT INTO public.products (
            name,
            product_sku,
            product_name,
            status,
            quantity,
            available_qty,
            cost_per_item,
            purchase_date,
            user_id
        ) VALUES (
            COALESCE(NEW.product_name, 'Unknown Product'),
            NEW.sku,
            COALESCE(NEW.product_name, 'Unknown Product'),
            'active',
            NEW.order_quantity, -- Initial quantity from order
            NEW.order_quantity, -- Set available to match order quantity
            NEW.product_cost_per_unit, -- Use cost from order
            NOW(), -- Current date as purchase date
            NEW.user_id
        )
        RETURNING id INTO v_product_id;
        
        -- Create a batch record for this product with sufficient quantity
        INSERT INTO public.product_batches (
            product_id,
            purchase_date,
            quantity_purchased,
            quantity_available,
            cost_per_item,
            user_id
        ) VALUES (
            v_product_id,
            NOW(),
            NEW.order_quantity,
            NEW.order_quantity,
            NEW.product_cost_per_unit,
            NEW.user_id
        );
        
        RAISE NOTICE 'Created missing product and batch for SKU: % (User: %)', NEW.sku, NEW.user_id;
    ELSE
        -- Product exists, but check if it has enough inventory
        SELECT id INTO v_product_id
        FROM public.products 
        WHERE product_sku = NEW.sku AND user_id = NEW.user_id;
        
        -- Check if there's a batch with available quantity
        SELECT EXISTS (
            SELECT 1 FROM public.product_batches
            WHERE product_id = v_product_id AND quantity_available > 0
        ) INTO v_batch_exists;
        
        -- If no batch exists or total available is less than needed, create a new batch
        IF NOT v_batch_exists OR (
            SELECT available_qty FROM public.products WHERE id = v_product_id
        ) < NEW.order_quantity THEN
            -- Create a batch record with sufficient quantity
            INSERT INTO public.product_batches (
                product_id,
                purchase_date,
                quantity_purchased,
                quantity_available,
                cost_per_item,
                user_id
            ) VALUES (
                v_product_id,
                NOW(),
                NEW.order_quantity,
                NEW.order_quantity,
                NEW.product_cost_per_unit,
                NEW.user_id
            );
            
            RAISE NOTICE 'Added inventory batch for existing product SKU: % (User: %)', NEW.sku, NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure products exist before order calculation
DROP TRIGGER IF EXISTS trigger_ensure_product_exists ON public.orders;
CREATE TRIGGER trigger_ensure_product_exists
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_product_exists_for_order();
-- --- END NEW: Function for auto-creating products from orders --- 

-- --- NEW: Function to return inventory when an order is deleted ---
CREATE OR REPLACE FUNCTION public.return_inventory_on_order_delete()
RETURNS TRIGGER AS $$
DECLARE
    consumption_record RECORD;
    v_total_returned INTEGER := 0;
BEGIN
    RAISE NOTICE 'Processing return for deleted order: ID=%, SKU=%, User=%', OLD.order_id, OLD.sku, OLD.user_id;
    
    -- Loop through consumption records for the deleted order line
    FOR consumption_record IN 
        SELECT * 
        FROM public.order_batch_consumption 
        WHERE order_id = OLD.order_id 
          AND order_sku = OLD.sku 
          AND user_id = OLD.user_id 
    LOOP
        -- Add the consumed quantity back to the original batch
        UPDATE public.product_batches
        SET quantity_available = quantity_available + consumption_record.quantity_consumed
        WHERE id = consumption_record.product_batch_id;
        
        v_total_returned := v_total_returned + consumption_record.quantity_consumed;
        
        RAISE NOTICE 'Added % back to batch ID %', consumption_record.quantity_consumed, consumption_record.product_batch_id;
    END LOOP;

    -- Delete the consumption records for the processed order line
    IF v_total_returned > 0 THEN
        DELETE FROM public.order_batch_consumption
        WHERE order_id = OLD.order_id 
          AND order_sku = OLD.sku 
          AND user_id = OLD.user_id;
          
        RAISE NOTICE 'Deleted consumption records for order ID %, SKU %. Total quantity returned: %', OLD.order_id, OLD.sku, v_total_returned;
    ELSE
         RAISE NOTICE 'No consumption records found to return for order ID %, SKU %', OLD.order_id, OLD.sku;
    END IF;

    RETURN OLD; -- Result is ignored for AFTER DELETE triggers
END;
$$ LANGUAGE plpgsql;

-- Create trigger to return inventory after an order is deleted
DROP TRIGGER IF EXISTS trigger_return_inventory_on_order_delete ON public.orders;
CREATE TRIGGER trigger_return_inventory_on_order_delete
    AFTER DELETE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.return_inventory_on_order_delete();
-- --- END NEW: Function to return inventory on order delete --- 

-- --- START Schema Changes for Precise Order Batch Tracking --- 

-- 1. Create the new tracking table
CREATE TABLE IF NOT EXISTS public.order_batch_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    order_sku VARCHAR(255) NOT NULL,
    product_batch_id UUID NOT NULL REFERENCES public.product_batches(id) ON DELETE CASCADE, -- Cascade delete if batch is deleted
    quantity_consumed INTEGER NOT NULL CHECK (quantity_consumed > 0),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_batch_consumption_order ON public.order_batch_consumption(user_id, order_id, order_sku);
CREATE INDEX IF NOT EXISTS idx_order_batch_consumption_batch ON public.order_batch_consumption(product_batch_id);

-- Enable RLS
ALTER TABLE public.order_batch_consumption ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own consumption records" 
ON public.order_batch_consumption FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consumption records" 
ON public.order_batch_consumption FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Deletes will be handled by the trigger function, no direct delete policy needed for users
CREATE POLICY "Service roles can delete consumption records" 
ON public.order_batch_consumption FOR DELETE 
USING (true); -- Allow deletion via trigger function

COMMENT ON TABLE public.order_batch_consumption IS 'Tracks which specific product batch was consumed by which order line item.';

-- --- END Schema Changes for Precise Order Batch Tracking --- 

-- --- START FIFO Inventory Batch Editing Functionality ---

-- Function to safely update a product batch with validation
CREATE OR REPLACE FUNCTION public.update_product_batch(
    p_batch_id UUID,
    p_purchase_date TIMESTAMPTZ = NULL,
    p_quantity_purchased INTEGER = NULL,
    p_quantity_available INTEGER = NULL,
    p_cost_per_item DECIMAL(10, 2) = NULL,
    p_batch_reference VARCHAR = NULL,
    p_user_id UUID = NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_original_batch RECORD;
    v_consumed_quantity INTEGER;
    v_max_available INTEGER;
    v_validation_msg TEXT;
BEGIN
    -- Get current batch details for validation
    SELECT * INTO v_original_batch
    FROM public.product_batches
    WHERE id = p_batch_id;
    
    IF v_original_batch IS NULL THEN
        RAISE EXCEPTION 'Batch with ID % not found', p_batch_id;
    END IF;
    
    -- Validate user authorization
    IF p_user_id IS NOT NULL AND v_original_batch.user_id != p_user_id THEN
        RAISE EXCEPTION 'User % is not authorized to edit this batch', p_user_id;
    END IF;
    
    -- Calculate consumed quantity
    v_consumed_quantity := v_original_batch.quantity_purchased - v_original_batch.quantity_available;
    
    -- Calculate maximum available quantity based on new purchased quantity
    IF p_quantity_purchased IS NOT NULL THEN
        v_max_available := p_quantity_purchased - v_consumed_quantity;
        
        -- Ensure purchased quantity isn't less than consumed
        IF p_quantity_purchased < v_consumed_quantity THEN
            RAISE EXCEPTION 'Cannot set purchased quantity (%) less than consumed quantity (%)', 
                p_quantity_purchased, v_consumed_quantity;
        END IF;
        
        -- If new available quantity specified, ensure it's valid
        IF p_quantity_available IS NOT NULL AND p_quantity_available > v_max_available THEN
            RAISE EXCEPTION 'Available quantity (%) cannot exceed purchased quantity (%) minus consumed quantity (%)',
                p_quantity_available, p_quantity_purchased, v_consumed_quantity;
        END IF;
    ELSE
        -- If only available quantity is changing, ensure it doesn't exceed original purchased minus consumed
        IF p_quantity_available IS NOT NULL THEN
            v_max_available := v_original_batch.quantity_purchased - v_consumed_quantity;
            
            IF p_quantity_available > v_max_available THEN
                RAISE EXCEPTION 'Available quantity (%) cannot exceed purchased quantity (%) minus consumed quantity (%)',
                    p_quantity_available, v_original_batch.quantity_purchased, v_consumed_quantity;
            END IF;
        END IF;
    END IF;
    
    -- All validations passed, perform the update
    UPDATE public.product_batches
    SET 
        purchase_date = COALESCE(p_purchase_date, purchase_date),
        quantity_purchased = COALESCE(p_quantity_purchased, quantity_purchased),
        quantity_available = COALESCE(p_quantity_available, quantity_available),
        cost_per_item = COALESCE(p_cost_per_item, cost_per_item)
        -- Add batch_reference column update when this column is added to the schema
        -- batch_reference = COALESCE(p_batch_reference, batch_reference)
    WHERE id = p_batch_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a new batch to an existing product
CREATE OR REPLACE FUNCTION public.add_product_batch(
    p_product_id UUID,
    p_purchase_date TIMESTAMPTZ,
    p_quantity_purchased INTEGER,
    p_quantity_available INTEGER,
    p_cost_per_item DECIMAL(10, 2),
    p_user_id UUID,
    p_batch_reference VARCHAR = NULL
)
RETURNS UUID AS $$
DECLARE
    v_product_exists BOOLEAN;
    v_batch_id UUID;
BEGIN
    -- Validate input
    IF p_quantity_purchased <= 0 THEN
        RAISE EXCEPTION 'Purchased quantity must be greater than zero';
    END IF;
    
    IF p_quantity_available < 0 OR p_quantity_available > p_quantity_purchased THEN
        RAISE EXCEPTION 'Available quantity must be between 0 and purchased quantity';
    END IF;
    
    -- Verify product exists and belongs to user
    SELECT EXISTS (
        SELECT 1 FROM public.products 
        WHERE id = p_product_id AND user_id = p_user_id
    ) INTO v_product_exists;
    
    IF NOT v_product_exists THEN
        RAISE EXCEPTION 'Product with ID % not found for user %', p_product_id, p_user_id;
    END IF;
    
    -- Insert the new batch
    INSERT INTO public.product_batches (
        product_id,
        purchase_date,
        quantity_purchased,
        quantity_available,
        cost_per_item,
        -- batch_reference, -- Add when this column is added to the schema
        user_id
    ) VALUES (
        p_product_id,
        p_purchase_date,
        p_quantity_purchased,
        p_quantity_available,
        p_cost_per_item,
        -- p_batch_reference, -- Add when this column is added to the schema
        p_user_id
    )
    RETURNING id INTO v_batch_id;
    
    -- Return the new batch ID
    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a batch (with validation)
CREATE OR REPLACE FUNCTION public.delete_product_batch(
    p_batch_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_batch RECORD;
    v_consumed_quantity INTEGER;
BEGIN
    -- Get batch details
    SELECT * INTO v_batch
    FROM public.product_batches
    WHERE id = p_batch_id AND user_id = p_user_id;
    
    IF v_batch IS NULL THEN
        RAISE EXCEPTION 'Batch with ID % not found or not owned by user %', p_batch_id, p_user_id;
    END IF;
    
    -- Calculate consumed quantity
    v_consumed_quantity := v_batch.quantity_purchased - v_batch.quantity_available;
    
    -- Cannot delete batches that have been consumed
    IF v_consumed_quantity > 0 THEN
        RAISE EXCEPTION 'Cannot delete batch with ID % as % units have been consumed', p_batch_id, v_consumed_quantity;
    END IF;
    
    -- Delete the batch
    DELETE FROM public.product_batches
    WHERE id = p_batch_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add batch_reference column to product_batches table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_batches' 
        AND column_name = 'batch_reference'
    ) THEN
        ALTER TABLE public.product_batches ADD COLUMN batch_reference VARCHAR(100);
        COMMENT ON COLUMN public.product_batches.batch_reference IS 'Reference identifier for this batch, can be used for tracking or organization';
    END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_product_batch(UUID, TIMESTAMPTZ, INTEGER, INTEGER, DECIMAL, VARCHAR, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_product_batch(UUID, TIMESTAMPTZ, INTEGER, INTEGER, DECIMAL, UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_product_batch(UUID, UUID) TO authenticated, service_role;

-- --- END FIFO Inventory Batch Editing Functionality --- 