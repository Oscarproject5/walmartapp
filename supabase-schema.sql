-- Schema for Walmart App Database

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
    remarks TEXT
);

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
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    item_condition TEXT
);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Orders Table with app_settings connection
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
    -- Define composite primary key
    PRIMARY KEY (order_id, sku)
);

-- Create a trigger to update the updated_at timestamp for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_timestamp
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- AI Recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    product_id UUID REFERENCES public.products(id),
    recommendation TEXT NOT NULL,
    explanation TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    impact_analysis JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    implemented_at TIMESTAMPTZ
);

-- Create inventory view
CREATE OR REPLACE VIEW public.inventory_view AS
SELECT 
    id,
    sku,
    product_sku,
    product_name,
    image_url,
    supplier,
    product_link,
    purchase_price,
    quantity AS total_qty,
    sales_qty,
    available_qty,
    per_qty_price,
    stock_value,
    status,
    remarks,
    created_at
FROM 
    public.products;

-- Add indices for performance
CREATE INDEX idx_products_product_sku ON public.products(product_sku);
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_orders_sku ON public.orders(sku);
CREATE INDEX idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX idx_sales_product_id ON public.sales(product_id);
CREATE INDEX idx_sales_order_number ON public.sales(order_number);

-- Add comments for documentation
COMMENT ON TABLE public.products IS 'Stores product inventory information including stock levels, costs, and sales data';
COMMENT ON TABLE public.orders IS 'Stores individual line items for each order. Uses a composite primary key (order_id, sku).';
COMMENT ON COLUMN public.orders.order_id IS 'Order identifier from the source system (e.g., Walmart Order #). Part of the composite primary key.';
COMMENT ON COLUMN public.orders.sku IS 'Product SKU for this line item. Part of the composite primary key.';
COMMENT ON TABLE public.app_settings IS 'Global application settings including shipping configuration and business rules';
COMMENT ON VIEW public.inventory_view IS 'Comprehensive view of inventory including all product details and calculations';

-- Insert default app settings
INSERT INTO public.app_settings (
    shipping_base_cost,
    label_cost,
    cancellation_shipping_loss,
    minimum_profit_margin,
    auto_reorder_enabled,
    auto_price_adjustment_enabled
)
VALUES (
    5.00,
    1.00,
    5.00,
    10.00,
    FALSE,
    FALSE
);

-- Important: Fix permissions by disabling RLS
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.canceled_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and anon users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, postgres;

-- Create function to update order costs from inventory
CREATE OR REPLACE FUNCTION public.update_order_costs_from_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to get per_qty_price first
    SELECT COALESCE(p.per_qty_price, p.cost_per_item)
    INTO NEW.product_cost_per_unit
    FROM public.products p
    WHERE LOWER(p.product_sku) = LOWER(NEW.sku)
    LIMIT 1;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order costs
CREATE TRIGGER update_order_costs_trigger
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_costs_from_inventory();

-- Create function to set fulfillment_cost from app_settings (allowing overrides)
CREATE OR REPLACE FUNCTION public.set_fulfillment_cost_from_settings()
RETURNS TRIGGER AS $$
DECLARE
    settings_record RECORD;
BEGIN
    -- Only set fulfillment_cost from settings if the incoming value is NULL or 0
    IF NEW.fulfillment_cost IS NULL OR NEW.fulfillment_cost <= 0 THEN
        -- Get the most recent app settings
        SELECT id, shipping_base_cost, label_cost
        INTO settings_record
        FROM public.app_settings
        ORDER BY updated_at DESC
        LIMIT 1;

        -- Set the fulfillment_cost as the sum of shipping_base_cost and label_cost
        NEW.fulfillment_cost := settings_record.shipping_base_cost + settings_record.label_cost;

        -- Also set the app_settings_id reference
        NEW.app_settings_id := settings_record.id;
    ELSE
        -- If a specific fulfillment_cost > 0 was provided, keep it.
        -- Still link to the current settings ID for reference.
        SELECT id INTO NEW.app_settings_id
        FROM public.app_settings
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set fulfillment_cost
CREATE TRIGGER set_fulfillment_cost_trigger
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_fulfillment_cost_from_settings();

-- Create function to DECREASE product sales_qty when an order is deleted
CREATE OR REPLACE FUNCTION public.decrease_product_sales_qty_on_order_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease the sales_qty in the products table by the quantity of the deleted order item
    UPDATE public.products
    SET sales_qty = sales_qty - OLD.order_quantity
    WHERE product_sku = OLD.sku;

    -- The OLD record refers to the row data being deleted
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function AFTER DELETE on orders
CREATE TRIGGER orders_delete_trigger
    AFTER DELETE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.decrease_product_sales_qty_on_order_delete();

-- Fix existing orders with incorrect costs
UPDATE public.orders o
SET product_cost_per_unit = p.per_qty_price
FROM public.products p
WHERE LOWER(o.sku) = LOWER(p.product_sku)
AND p.per_qty_price IS NOT NULL
AND ABS(o.product_cost_per_unit - p.per_qty_price) > 0.001;

-- For any remaining orders where per_qty_price wasn't available, use cost_per_item
UPDATE public.orders o
SET product_cost_per_unit = p.cost_per_item
FROM public.products p
WHERE LOWER(o.sku) = LOWER(p.product_sku)
AND p.per_qty_price IS NULL
AND p.cost_per_item IS NOT NULL
AND ABS(o.product_cost_per_unit - p.cost_per_item) > 0.001; 

-- Update existing orders with app_settings and fulfillment costs
DO $$
DECLARE
    settings_id UUID;
    shipping_cost DECIMAL(10,2);
    label_fee DECIMAL(10,2);
BEGIN
    -- Get the most recent app settings
    SELECT id, shipping_base_cost, label_cost 
    INTO settings_id, shipping_cost, label_fee
    FROM public.app_settings
    ORDER BY updated_at DESC
    LIMIT 1;
    
    -- Update app_settings_id for all orders
    UPDATE public.orders
    SET app_settings_id = settings_id
    WHERE app_settings_id IS NULL;
    
    -- Update fulfillment_cost where it's missing or zero
    UPDATE public.orders
    SET fulfillment_cost = shipping_cost + label_fee
    WHERE fulfillment_cost IS NULL OR fulfillment_cost = 0;
END $$; 