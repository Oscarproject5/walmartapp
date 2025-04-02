-- Sample data for the Orders table
-- This script inserts sample order records with realistic data
-- Run this after the orders-table-migration.sql script

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

-- Insert sample orders
INSERT INTO public.orders (
    product_sku,
    product_name,
    quantity,
    walmart_price_per_unit,
    shipping_fee_per_unit,
    label_fee,
    cost_per_unit,
    order_status,
    order_date,
    delivery_date,
    supplier,
    supplier_order_date,
    additional_costs
)
SELECT
    p.product_sku,
    p.name,
    2, -- quantity
    49.99, -- walmart_price_per_unit
    4.99, -- shipping_fee_per_unit
    1.50, -- label_fee
    p.cost_per_item, -- cost_per_unit
    'Completed', -- order_status
    NOW() - INTERVAL '14 days', -- order_date
    NOW() - INTERVAL '10 days', -- delivery_date
    p.source, -- supplier
    p.purchase_date, -- supplier_order_date
    0 -- additional_costs
FROM
    public.products p
WHERE
    p.product_sku IS NOT NULL
LIMIT 1;

-- Insert another sample order with different status
INSERT INTO public.orders (
    product_sku,
    product_name,
    quantity,
    walmart_price_per_unit,
    shipping_fee_per_unit,
    label_fee,
    cost_per_unit,
    order_status,
    order_date,
    delivery_date,
    supplier,
    supplier_order_date,
    additional_costs,
    cancellation_loss
)
SELECT
    p.product_sku,
    p.name,
    1, -- quantity
    59.99, -- walmart_price_per_unit
    5.99, -- shipping_fee_per_unit
    1.50, -- label_fee
    p.cost_per_item, -- cost_per_unit
    'Canceled_After_Shipped', -- order_status
    NOW() - INTERVAL '21 days', -- order_date
    NULL, -- delivery_date
    p.source, -- supplier
    p.purchase_date, -- supplier_order_date
    0, -- additional_costs
    7.49 -- cancellation_loss
FROM
    public.products p
WHERE
    p.product_sku IS NOT NULL AND
    p.id != (SELECT id FROM public.products WHERE product_sku IS NOT NULL LIMIT 1)
LIMIT 1;

-- Insert a third sample order with different status
INSERT INTO public.orders (
    product_sku,
    product_name,
    quantity,
    walmart_price_per_unit,
    shipping_fee_per_unit,
    label_fee,
    cost_per_unit,
    order_status,
    order_date,
    delivery_date,
    supplier,
    supplier_order_date,
    additional_costs
)
SELECT
    p.product_sku,
    p.name,
    3, -- quantity
    29.99, -- walmart_price_per_unit
    3.99, -- shipping_fee_per_unit
    1.50, -- label_fee
    p.cost_per_item, -- cost_per_unit
    'Canceled_Not_Shipped', -- order_status
    NOW() - INTERVAL '7 days', -- order_date
    NULL, -- delivery_date
    p.source, -- supplier
    p.purchase_date, -- supplier_order_date
    2.50 -- additional_costs
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
    product_sku,
    product_name,
    quantity,
    walmart_price_per_unit,
    shipping_fee_per_unit,
    label_fee,
    cost_per_unit,
    order_status,
    order_date,
    delivery_date,
    supplier,
    supplier_order_date,
    additional_costs
)
VALUES (
    (SELECT product_sku FROM public.products WHERE product_sku IS NOT NULL LIMIT 1),
    'Premium Wireless Headphones',
    5,
    69.99,
    6.99,
    1.50,
    35.00,
    'Completed',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 days',
    'amazon',
    NOW() - INTERVAL '10 days',
    3.75
);

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Sample orders have been inserted successfully.';
END $$; 