-- ====================================================================
-- COMPLETE DATABASE SCHEMA FOR WALMART INVENTORY MANAGEMENT APP
-- ====================================================================
-- This file contains the complete database schema for Supabase setup.
-- Run this entire file in your Supabase SQL Editor to set up everything.
-- ====================================================================

-- ====================================================================
-- SECTION 1: PERMISSIONS & SCHEMA SETUP
-- ====================================================================

-- Grant permissions to the schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- ====================================================================
-- SECTION 2: CORE TABLES
-- ====================================================================

-- Products Table (Aggregated inventory information)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0, -- Total purchased quantity across batches
    cost_per_item DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Weighted average cost
    purchase_date TIMESTAMPTZ DEFAULT NOW(), -- First purchase date
    source VARCHAR(50) DEFAULT 'walmart',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sku VARCHAR(50),
    product_sku VARCHAR(50), -- Key identifier
    product_name VARCHAR(255),
    image_url TEXT,
    supplier VARCHAR(100),
    product_link TEXT,
    sales_qty INTEGER DEFAULT 0, -- Calculated: sum(batch.purchased - batch.available)
    available_qty INTEGER DEFAULT 0, -- Calculated: sum(batch.available)
    stock_value DECIMAL(10, 2), -- Calculated: sum(batch.available * batch.cost)
    status VARCHAR(50) DEFAULT 'active',
    remarks TEXT,
    user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Add composite unique constraint for multi-tenancy
ALTER TABLE public.products ADD CONSTRAINT products_user_id_product_sku_key UNIQUE (user_id, product_sku);

-- Product Batches Table (For FIFO tracking)
CREATE TABLE IF NOT EXISTS public.product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    purchase_date TIMESTAMPTZ NOT NULL,
    quantity_purchased INTEGER NOT NULL CHECK (quantity_purchased >= 0),
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    cost_per_item DECIMAL(10, 2) NOT NULL,
    batch_reference VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT quantity_available_le_purchased CHECK (quantity_available <= quantity_purchased)
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
    walmart_shipping_total DECIMAL(12, 2),
    walmart_item_total DECIMAL(12, 2),
    total_revenue DECIMAL(12, 2),
    walmart_fee DECIMAL(12, 2),
    product_cost_total DECIMAL(12, 2),
    net_profit DECIMAL(12, 2),
    roi DECIMAL(6, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    upload_batch_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    PRIMARY KEY (order_id, sku)
);

-- Add foreign key constraint for orders
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_sku_fkey
FOREIGN KEY (user_id, sku) REFERENCES products(user_id, product_sku);

-- Order Batch Consumption Tracking Table
CREATE TABLE IF NOT EXISTS public.order_batch_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    order_sku VARCHAR(255) NOT NULL,
    product_batch_id UUID NOT NULL REFERENCES public.product_batches(id) ON DELETE CASCADE,
    quantity_consumed INTEGER NOT NULL CHECK (quantity_consumed > 0),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  company_name VARCHAR(100),
  business_type VARCHAR(50),
  tax_id VARCHAR(50),
  walmart_seller_id VARCHAR(50),
  amazon_seller_id VARCHAR(50),
  address_line1 VARCHAR(100),
  address_line2 VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50),
  profile_image_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations Table
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
  status VARCHAR(20) DEFAULT 'active',
  CONSTRAINT code_not_empty CHECK (char_length(code) >= 6)
);

-- ====================================================================
-- SECTION 3: INDEXES FOR PERFORMANCE
-- ====================================================================

-- Products indexes
CREATE INDEX IF NOT EXISTS products_product_sku_idx ON products(product_sku);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Product batches indexes
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_user_id_product_id ON product_batches(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_purchase_date ON product_batches(purchase_date);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_sku ON orders(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_upload_batch_id ON orders(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Order batch consumption indexes
CREATE INDEX IF NOT EXISTS idx_order_batch_consumption_order ON order_batch_consumption(user_id, order_id, order_sku);
CREATE INDEX IF NOT EXISTS idx_order_batch_consumption_batch ON order_batch_consumption(product_batch_id);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON sales(order_number);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS invitations_code_idx ON invitations(code);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations(email);

-- ====================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_batch_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canceled_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Products RLS Policies
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

-- Product Batches RLS Policies
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

-- App Settings RLS Policies
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

-- Orders RLS Policies
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

-- Order Batch Consumption RLS Policies
CREATE POLICY "Users can view their own consumption records"
ON public.order_batch_consumption FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consumption records"
ON public.order_batch_consumption FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service roles can delete consumption records"
ON public.order_batch_consumption FOR DELETE
USING (true);

-- Sales RLS Policies
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

-- Canceled Orders RLS Policies
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

-- AI Recommendations RLS Policies
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

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Invitations RLS Policies
CREATE POLICY "Admins can view all invitations"
ON public.invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

CREATE POLICY "Users can view their own invitations"
ON public.invitations FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins can insert invitations"
ON public.invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

CREATE POLICY "Admins can update invitations"
ON public.invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

CREATE POLICY "Admins can delete invitations"
ON public.invitations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- ====================================================================
-- SECTION 5: VIEWS
-- ====================================================================

-- Inventory View
CREATE OR REPLACE VIEW public.inventory_view AS
SELECT
    p.id,
    p.product_sku,
    p.product_name,
    p.quantity as total_purchased_quantity,
    p.available_qty,
    p.sales_qty,
    p.cost_per_item as average_cost_per_item,
    p.stock_value,
    p.purchase_date as first_purchase_date,
    p.status,
    p.user_id
FROM
    public.products p
WHERE
    p.status != 'inactive';

-- Batch Analytics View
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

-- Grant permissions on views
GRANT SELECT ON public.inventory_view TO postgres, anon, authenticated, service_role;
GRANT SELECT ON public.batch_analytics_view TO postgres, anon, authenticated, service_role;

-- ====================================================================
-- SECTION 6: FUNCTIONS
-- ====================================================================

-- Function to create default app settings for a user
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

-- Function to update product aggregates from batches
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

    -- Get the current status before recalculating
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

    -- Calculate weighted average cost
    IF v_total_quantity_available > 0 THEN
        v_weighted_avg_cost := v_total_stock_value / v_total_quantity_available;
    ELSE
        SELECT cost_per_item INTO v_weighted_avg_cost FROM public.products WHERE id = v_product_id;
        IF NOT FOUND OR v_weighted_avg_cost IS NULL THEN
           v_weighted_avg_cost := 0;
        END IF;
    END IF;

    -- Update the products table
    UPDATE public.products
    SET
        available_qty = v_total_quantity_available,
        quantity = v_total_quantity_purchased,
        sales_qty = v_total_quantity_purchased - v_total_quantity_available,
        stock_value = v_total_stock_value,
        cost_per_item = v_weighted_avg_cost,
        purchase_date = v_first_purchase_date,
        status = CASE
            WHEN v_current_status = 'inactive' THEN 'inactive'
            WHEN v_total_quantity_available <= 0 THEN 'out_of_stock'
            ELSE 'active'
        END
    WHERE id = v_product_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to consume inventory via FIFO
CREATE OR REPLACE FUNCTION public.consume_product_inventory_fifo(
    p_user_id UUID,
    p_product_sku VARCHAR(50),
    p_quantity_to_consume INTEGER,
    p_order_id TEXT,
    p_order_sku VARCHAR
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

    -- Auto-create inventory if needed
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

        -- Record the consumption
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
       RAISE EXCEPTION 'Inventory consumption mismatch for SKU %. Required: %, Consumed: %.',
           p_product_sku, p_quantity_to_consume, v_total_quantity_consumed;
    END IF;

    consumed_cost := v_total_cost;
    quantity_consumed_total := v_total_quantity_consumed;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for order financial calculations and inventory consumption
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
    v_total_cost_basis DECIMAL(12, 2);
BEGIN
    -- Calculate Fulfillment Cost
    IF NEW.fulfillment_cost IS NULL OR NEW.fulfillment_cost <= 0 THEN
        SELECT id, shipping_base_cost, label_cost
        INTO settings_record
        FROM public.app_settings
        WHERE user_id = NEW.user_id
        ORDER BY updated_at DESC
        LIMIT 1;

        IF settings_record IS NULL THEN
             SELECT id, shipping_base_cost, label_cost INTO settings_record
             FROM public.app_settings
             WHERE id = public.create_default_app_settings(NEW.user_id);

             IF settings_record IS NULL THEN
                v_fulfillment_cost := 5.00 + 1.00;
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
        SELECT id INTO NEW.app_settings_id
        FROM public.app_settings
        WHERE user_id = NEW.user_id
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;

    -- Consume Inventory using FIFO
    IF TG_OP = 'INSERT' THEN
        IF NEW.order_quantity > 0 THEN
            SELECT consumed_cost, quantity_consumed_total
            INTO fifo_result
            FROM public.consume_product_inventory_fifo(NEW.user_id, NEW.sku, NEW.order_quantity, NEW.order_id, NEW.sku);

            IF fifo_result.quantity_consumed_total IS NULL OR fifo_result.quantity_consumed_total != NEW.order_quantity THEN
                 RAISE EXCEPTION 'Failed to consume required quantity (%) for SKU %. Consumed: %',
                     NEW.order_quantity, NEW.sku, COALESCE(fifo_result.quantity_consumed_total, 0);
            END IF;
            v_product_cost_total := COALESCE(fifo_result.consumed_cost, 0);
        ELSE
             v_product_cost_total := 0;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.product_cost_total IS NOT DISTINCT FROM OLD.product_cost_total THEN
            IF NEW.order_quantity != OLD.order_quantity OR NEW.product_cost_per_unit != OLD.product_cost_per_unit THEN
                 v_product_cost_total := NEW.product_cost_per_unit * NEW.order_quantity;
            ELSE
                v_product_cost_total := NEW.product_cost_total;
            END IF;
        ELSE
             v_product_cost_total := NEW.product_cost_total;
        END IF;
    END IF;

    -- Calculate financial fields
    NEW.walmart_item_total := NEW.walmart_price_per_unit * NEW.order_quantity;
    NEW.walmart_shipping_total := NEW.walmart_shipping_fee_per_unit * NEW.order_quantity;
    v_total_revenue := NEW.walmart_item_total + NEW.walmart_shipping_total;
    v_walmart_fee := v_total_revenue * 0.08;

    NEW.product_cost_total := v_product_cost_total;
     IF NEW.order_quantity > 0 THEN
       NEW.product_cost_per_unit := v_product_cost_total / NEW.order_quantity;
     ELSE
       NEW.product_cost_per_unit := 0;
     END IF;

    -- Calculate Net Profit
    v_net_profit := v_total_revenue - v_product_cost_total - v_fulfillment_cost - v_walmart_fee;

    -- Calculate ROI
    v_total_cost_basis := v_product_cost_total + v_fulfillment_cost + v_walmart_fee;
    IF v_total_cost_basis != 0 THEN
        NEW.roi := (v_net_profit / v_total_cost_basis) * 100;
    ELSE
        IF v_net_profit > 0 THEN
           NEW.roi := NULL;
        ELSE
           NEW.roi := 0;
        END IF;
    END IF;

    -- Set calculated fields
    NEW.total_revenue := v_total_revenue;
    NEW.walmart_fee := v_walmart_fee;
    NEW.net_profit := v_net_profit;
    NEW.updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure product exists for order
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
            NEW.order_quantity,
            NEW.order_quantity,
            NEW.product_cost_per_unit,
            NOW(),
            NEW.user_id
        )
        RETURNING id INTO v_product_id;

        -- Create a batch record for this product
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
        -- Product exists, check inventory
        SELECT id INTO v_product_id
        FROM public.products
        WHERE product_sku = NEW.sku AND user_id = NEW.user_id;

        SELECT EXISTS (
            SELECT 1 FROM public.product_batches
            WHERE product_id = v_product_id AND quantity_available > 0
        ) INTO v_batch_exists;

        IF NOT v_batch_exists OR (
            SELECT available_qty FROM public.products WHERE id = v_product_id
        ) < NEW.order_quantity THEN
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

-- Function to return inventory when order is deleted
CREATE OR REPLACE FUNCTION public.return_inventory_on_order_delete()
RETURNS TRIGGER AS $$
DECLARE
    consumption_record RECORD;
    v_total_returned INTEGER := 0;
BEGIN
    RAISE NOTICE 'Processing return for deleted order: ID=%, SKU=%, User=%', OLD.order_id, OLD.sku, OLD.user_id;

    -- Loop through consumption records
    FOR consumption_record IN
        SELECT *
        FROM public.order_batch_consumption
        WHERE order_id = OLD.order_id
          AND order_sku = OLD.sku
          AND user_id = OLD.user_id
    LOOP
        -- Add consumed quantity back to batch
        UPDATE public.product_batches
        SET quantity_available = quantity_available + consumption_record.quantity_consumed
        WHERE id = consumption_record.product_batch_id;

        v_total_returned := v_total_returned + consumption_record.quantity_consumed;

        RAISE NOTICE 'Added % back to batch ID %', consumption_record.quantity_consumed, consumption_record.product_batch_id;
    END LOOP;

    -- Delete consumption records
    IF v_total_returned > 0 THEN
        DELETE FROM public.order_batch_consumption
        WHERE order_id = OLD.order_id
          AND order_sku = OLD.sku
          AND user_id = OLD.user_id;

        RAISE NOTICE 'Deleted consumption records for order ID %, SKU %. Total quantity returned: %',
            OLD.order_id, OLD.sku, v_total_returned;
    ELSE
         RAISE NOTICE 'No consumption records found to return for order ID %, SKU %', OLD.order_id, OLD.sku;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update orders timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user profile creation
-- First user automatically becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Create profile (first user becomes admin)
  INSERT INTO public.profiles (id, is_admin)
  VALUES (NEW.id, (user_count = 0));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch management functions
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
BEGIN
    SELECT * INTO v_original_batch
    FROM public.product_batches
    WHERE id = p_batch_id;

    IF v_original_batch IS NULL THEN
        RAISE EXCEPTION 'Batch with ID % not found', p_batch_id;
    END IF;

    IF p_user_id IS NOT NULL AND v_original_batch.user_id != p_user_id THEN
        RAISE EXCEPTION 'User % is not authorized to edit this batch', p_user_id;
    END IF;

    v_consumed_quantity := v_original_batch.quantity_purchased - v_original_batch.quantity_available;

    IF p_quantity_purchased IS NOT NULL THEN
        v_max_available := p_quantity_purchased - v_consumed_quantity;

        IF p_quantity_purchased < v_consumed_quantity THEN
            RAISE EXCEPTION 'Cannot set purchased quantity (%) less than consumed quantity (%)',
                p_quantity_purchased, v_consumed_quantity;
        END IF;

        IF p_quantity_available IS NOT NULL AND p_quantity_available > v_max_available THEN
            RAISE EXCEPTION 'Available quantity (%) cannot exceed purchased quantity (%) minus consumed quantity (%)',
                p_quantity_available, p_quantity_purchased, v_consumed_quantity;
        END IF;
    ELSE
        IF p_quantity_available IS NOT NULL THEN
            v_max_available := v_original_batch.quantity_purchased - v_consumed_quantity;

            IF p_quantity_available > v_max_available THEN
                RAISE EXCEPTION 'Available quantity (%) cannot exceed purchased quantity (%) minus consumed quantity (%)',
                    p_quantity_available, v_original_batch.quantity_purchased, v_consumed_quantity;
            END IF;
        END IF;
    END IF;

    UPDATE public.product_batches
    SET
        purchase_date = COALESCE(p_purchase_date, purchase_date),
        quantity_purchased = COALESCE(p_quantity_purchased, quantity_purchased),
        quantity_available = COALESCE(p_quantity_available, quantity_available),
        cost_per_item = COALESCE(p_cost_per_item, cost_per_item),
        batch_reference = COALESCE(p_batch_reference, batch_reference)
    WHERE id = p_batch_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    IF p_quantity_purchased <= 0 THEN
        RAISE EXCEPTION 'Purchased quantity must be greater than zero';
    END IF;

    IF p_quantity_available < 0 OR p_quantity_available > p_quantity_purchased THEN
        RAISE EXCEPTION 'Available quantity must be between 0 and purchased quantity';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.products
        WHERE id = p_product_id AND user_id = p_user_id
    ) INTO v_product_exists;

    IF NOT v_product_exists THEN
        RAISE EXCEPTION 'Product with ID % not found for user %', p_product_id, p_user_id;
    END IF;

    INSERT INTO public.product_batches (
        product_id,
        purchase_date,
        quantity_purchased,
        quantity_available,
        cost_per_item,
        batch_reference,
        user_id
    ) VALUES (
        p_product_id,
        p_purchase_date,
        p_quantity_purchased,
        p_quantity_available,
        p_cost_per_item,
        p_batch_reference,
        p_user_id
    )
    RETURNING id INTO v_batch_id;

    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_product_batch(
    p_batch_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_batch RECORD;
    v_consumed_quantity INTEGER;
BEGIN
    SELECT * INTO v_batch
    FROM public.product_batches
    WHERE id = p_batch_id AND user_id = p_user_id;

    IF v_batch IS NULL THEN
        RAISE EXCEPTION 'Batch with ID % not found or not owned by user %', p_batch_id, p_user_id;
    END IF;

    v_consumed_quantity := v_batch.quantity_purchased - v_batch.quantity_available;

    IF v_consumed_quantity > 0 THEN
        RAISE EXCEPTION 'Cannot delete batch with ID % as % units have been consumed', p_batch_id, v_consumed_quantity;
    END IF;

    DELETE FROM public.product_batches
    WHERE id = p_batch_id AND user_id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invitation system functions
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

-- Get batch data function
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

-- Reset product quantities function
CREATE OR REPLACE FUNCTION public.reset_product_quantities(user_id_param UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF user_id_param IS NOT NULL THEN
        UPDATE public.products
        SET
            sales_qty = 0,
            available_qty = 0,
            stock_value = 0,
            quantity = 0,
            cost_per_item = 0
        WHERE user_id = user_id_param;
    ELSE
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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_default_app_settings(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.consume_product_inventory_fifo(UUID, VARCHAR, INTEGER, TEXT, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_product_batch(UUID, TIMESTAMPTZ, INTEGER, INTEGER, DECIMAL, VARCHAR, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_product_batch(UUID, TIMESTAMPTZ, INTEGER, INTEGER, DECIMAL, UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_product_batch(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_batch_data(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reset_product_quantities(UUID) TO authenticated, anon, service_role;

-- ====================================================================
-- SECTION 7: TRIGGERS
-- ====================================================================

-- Trigger to update product aggregates from batches
DROP TRIGGER IF EXISTS trigger_update_product_aggregates ON public.product_batches;
CREATE TRIGGER trigger_update_product_aggregates
    AFTER INSERT OR UPDATE OR DELETE ON public.product_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_product_aggregates_from_batches();

-- Trigger to ensure products exist before order calculation
DROP TRIGGER IF EXISTS trigger_ensure_product_exists ON public.orders;
CREATE TRIGGER trigger_ensure_product_exists
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_product_exists_for_order();

-- Trigger for order financial calculations
DROP TRIGGER IF EXISTS trigger_calculate_order_financials ON public.orders;
CREATE TRIGGER trigger_calculate_order_financials
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_order_financials_and_consume_inventory();

-- Trigger to return inventory after order deletion
DROP TRIGGER IF EXISTS trigger_return_inventory_on_order_delete ON public.orders;
CREATE TRIGGER trigger_return_inventory_on_order_delete
    AFTER DELETE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.return_inventory_on_order_delete();

-- Trigger to update orders timestamp
DROP TRIGGER IF EXISTS trigger_update_orders_timestamp ON public.orders;
CREATE TRIGGER trigger_update_orders_timestamp
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- SECTION 8: STORAGE BUCKETS
-- ====================================================================

-- Create avatars storage bucket
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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage RLS Policies
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
)
WITH CHECK (
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

-- ====================================================================
-- SECTION 9: INITIAL DATA SETUP
-- ====================================================================

-- Create profiles for existing users
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
);

-- ====================================================================
-- SECTION 10: COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.products IS 'Stores aggregated product inventory information derived from product_batches';
COMMENT ON TABLE public.product_batches IS 'Stores individual purchase batches of products for FIFO tracking';
COMMENT ON TABLE public.orders IS 'Stores individual line items for each order with composite primary key (order_id, sku)';
COMMENT ON TABLE public.order_batch_consumption IS 'Tracks which specific product batch was consumed by which order line item';
COMMENT ON TABLE public.app_settings IS 'Global application settings including shipping configuration and business rules';
COMMENT ON TABLE public.profiles IS 'User profile information including business details and avatar';
COMMENT ON TABLE public.invitations IS 'Invitation codes for user registration';
COMMENT ON VIEW public.inventory_view IS 'Comprehensive view of inventory including all product details and calculations';
COMMENT ON VIEW public.batch_analytics_view IS 'Aggregated view of upload batches with order counts and timestamps';

-- ====================================================================
-- END OF COMPLETE DATABASE SCHEMA
-- ====================================================================