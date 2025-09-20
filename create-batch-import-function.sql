-- ====================================================================
-- CREATE BATCH IMPORT FUNCTION
-- ====================================================================
-- This function properly handles importing products that are bought
-- multiple times at different dates/prices
-- ====================================================================

-- CREATE THE IMPORT FUNCTION
CREATE OR REPLACE FUNCTION public.import_product_with_batch(
    p_user_id UUID,
    p_product_sku VARCHAR(50),
    p_name VARCHAR(255),
    p_quantity INTEGER,
    p_cost_per_item DECIMAL(10,2),
    p_purchase_date TIMESTAMPTZ DEFAULT NOW(),
    p_image_url TEXT DEFAULT NULL,
    p_supplier VARCHAR(100) DEFAULT NULL,
    p_product_link TEXT DEFAULT NULL,
    p_batch_reference VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
    v_batch_id UUID;
    v_existing_avg_cost DECIMAL(10,2);
    v_existing_quantity INTEGER;
    v_new_avg_cost DECIMAL(10,2);
BEGIN
    -- Step 1: Get or create the product (aggregate record)
    SELECT id, cost_per_item, quantity
    INTO v_product_id, v_existing_avg_cost, v_existing_quantity
    FROM public.products
    WHERE user_id = p_user_id AND product_sku = p_product_sku;

    IF v_product_id IS NULL THEN
        -- Create new product
        INSERT INTO public.products (
            user_id, product_sku, name, product_name,
            quantity, available_qty, cost_per_item, per_qty_price,
            purchase_date, image_url, supplier, product_link,
            status, stock_value
        ) VALUES (
            p_user_id, p_product_sku, p_name, p_name,
            p_quantity, p_quantity, p_cost_per_item, p_cost_per_item,
            p_purchase_date, p_image_url, p_supplier, p_product_link,
            'active', p_quantity * p_cost_per_item
        )
        RETURNING id INTO v_product_id;

        RAISE NOTICE 'Created new product: % (ID: %)', p_product_sku, v_product_id;
    ELSE
        -- Update existing product with weighted average cost
        v_new_avg_cost := (
            (COALESCE(v_existing_avg_cost, 0) * COALESCE(v_existing_quantity, 0)) +
            (p_cost_per_item * p_quantity)
        ) / NULLIF(COALESCE(v_existing_quantity, 0) + p_quantity, 0);

        UPDATE public.products
        SET
            quantity = quantity + p_quantity,
            available_qty = available_qty + p_quantity,
            cost_per_item = v_new_avg_cost,
            per_qty_price = v_new_avg_cost,
            stock_value = (available_qty + p_quantity) * v_new_avg_cost,
            image_url = COALESCE(image_url, p_image_url),
            supplier = COALESCE(supplier, p_supplier),
            product_link = COALESCE(product_link, p_product_link)
        WHERE id = v_product_id;

        RAISE NOTICE 'Updated product: % (Added Qty: %)', p_product_sku, p_quantity;
    END IF;

    -- Step 2: Create a batch record for this purchase
    INSERT INTO public.product_batches (
        product_id,
        purchase_date,
        quantity_purchased,
        quantity_available,
        cost_per_item,
        batch_reference,
        user_id
    ) VALUES (
        v_product_id,
        p_purchase_date,
        p_quantity,
        p_quantity,  -- Initially all available
        p_cost_per_item,
        p_batch_reference,
        p_user_id
    )
    RETURNING id INTO v_batch_id;

    RAISE NOTICE 'Created batch: % for product: %', v_batch_id, p_product_sku;

    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.import_product_with_batch(UUID, VARCHAR, VARCHAR, INTEGER, DECIMAL, TIMESTAMPTZ, TEXT, VARCHAR, TEXT, VARCHAR) TO authenticated;

-- ====================================================================
-- VERIFY FUNCTION WAS CREATED
-- ====================================================================
SELECT
    'Function Created:' as status,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'import_product_with_batch'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ====================================================================
-- EXAMPLE USAGE
-- ====================================================================
-- This function should be called when importing products that may have
-- been purchased multiple times at different dates/prices
--
-- Example:
-- SELECT import_product_with_batch(
--     'user-uuid-here',
--     'SKU-001',
--     'Product Name',
--     10,           -- quantity
--     5.99,         -- cost per item
--     '2024-01-15'  -- purchase date
-- );
--
-- When called multiple times with the same SKU:
-- - First call: Creates product and first batch
-- - Subsequent calls: Updates product totals and adds new batches
-- ====================================================================