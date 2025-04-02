-- Sample data for the updated Orders table
-- This script inserts sample order records with realistic data
-- Run this after the orders-table-update.sql migration

-- First, make sure we have some product_sku values in the products table for referencing
DO $$ 
BEGIN
    -- Check if any products lack a product_sku
    IF EXISTS (
        SELECT 1 FROM public.products 
        WHERE product_sku IS NULL OR product_sku = ''
    ) THEN
        -- Update products without a product_sku
        UPDATE public.products
        SET product_sku = 'SKU-' || id::text
        WHERE product_sku IS NULL OR product_sku = '';
    END IF;
END $$;

-- Insert sample orders with the new schema
INSERT INTO public.orders (
    order_date,
    customer_name,
    sku,
    product_name,
    order_quantity,
    walmart_price_per_unit,
    walmart_shipping_fee_per_unit,
    product_cost_per_unit,
    fulfillment_cost
)
SELECT
    NOW() - INTERVAL '14 days', -- order_date
    'John Smith', -- customer_name
    p.product_sku, -- sku
    p.name, -- product_name
    2, -- order_quantity
    49.99, -- walmart_price_per_unit
    4.99, -- walmart_shipping_fee_per_unit
    p.cost_per_item, -- product_cost_per_unit
    5.00 -- fulfillment_cost
FROM
    public.products p
WHERE
    p.product_sku IS NOT NULL
LIMIT 1;

-- Insert another sample order
INSERT INTO public.orders (
    order_date,
    customer_name,
    sku,
    product_name,
    order_quantity,
    walmart_price_per_unit,
    walmart_shipping_fee_per_unit,
    product_cost_per_unit,
    fulfillment_cost
)
SELECT
    NOW() - INTERVAL '21 days', -- order_date
    'Sarah Johnson', -- customer_name
    p.product_sku, -- sku
    p.name, -- product_name
    1, -- order_quantity
    59.99, -- walmart_price_per_unit
    5.99, -- walmart_shipping_fee_per_unit
    p.cost_per_item, -- product_cost_per_unit
    5.00 -- fulfillment_cost
FROM
    public.products p
WHERE
    p.product_sku IS NOT NULL AND
    p.id != (SELECT id FROM public.products WHERE product_sku IS NOT NULL LIMIT 1)
LIMIT 1;

-- Insert a third sample order
INSERT INTO public.orders (
    order_date,
    customer_name,
    sku,
    product_name,
    order_quantity,
    walmart_price_per_unit,
    walmart_shipping_fee_per_unit,
    product_cost_per_unit,
    fulfillment_cost
)
SELECT
    NOW() - INTERVAL '7 days', -- order_date
    'Michael Brown', -- customer_name
    p.product_sku, -- sku
    p.name, -- product_name
    3, -- order_quantity
    29.99, -- walmart_price_per_unit
    3.99, -- walmart_shipping_fee_per_unit
    p.cost_per_item, -- product_cost_per_unit
    5.00 -- fulfillment_cost
FROM
    public.products p
WHERE
    p.product_sku IS NOT NULL AND
    p.id NOT IN (
        SELECT id FROM public.products WHERE product_sku IS NOT NULL LIMIT 2
    )
LIMIT 1;

-- Insert a manual sample order with specific values
INSERT INTO public.orders (
    order_date,
    customer_name,
    sku,
    product_name,
    order_quantity,
    walmart_price_per_unit,
    walmart_shipping_fee_per_unit,
    product_cost_per_unit,
    fulfillment_cost
)
VALUES (
    NOW() - INTERVAL '5 days', -- order_date
    'Emily Davis', -- customer_name
    (SELECT product_sku FROM public.products WHERE product_sku IS NOT NULL LIMIT 1), -- sku
    'Premium Wireless Headphones', -- product_name
    5, -- order_quantity
    69.99, -- walmart_price_per_unit
    6.99, -- walmart_shipping_fee_per_unit
    35.00, -- product_cost_per_unit
    5.00 -- fulfillment_cost
);

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Sample orders have been inserted successfully for the updated schema.';
END $$; 