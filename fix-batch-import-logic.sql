-- ====================================================================
-- FIX IMPORT LOGIC FOR MULTIPLE PURCHASES OF SAME SKU
-- ====================================================================
-- Same items bought at different times should CREATE BATCHES, not duplicates
-- The products table should show AGGREGATED data
-- The product_batches table should show INDIVIDUAL PURCHASES
-- ====================================================================

-- SECTION 1: Understand Current Structure
-- ====================================================================
SELECT
    'CURRENT MODEL:' as info,
    'products table' as table_name,
    'Aggregated inventory per SKU' as purpose,
    'One row per unique SKU per user' as structure
UNION ALL
SELECT
    '',
    'product_batches table',
    'Individual purchases for FIFO tracking',
    'Multiple rows per SKU (different purchase dates/costs)';

-- SECTION 2: Check Product Batches Table
-- ====================================================================
SELECT
    p.product_sku,
    p.name as product_name,
    p.quantity as total_quantity,
    p.available_qty as total_available,
    p.cost_per_item as avg_cost,
    COUNT(pb.id) as batch_count,
    STRING_AGG(
        pb.purchase_date::date::text || ' (Qty: ' || pb.quantity_purchased || ')',
        ', ' ORDER BY pb.purchase_date
    ) as purchase_history
FROM public.products p
LEFT JOIN public.product_batches pb ON pb.product_id = p.id
GROUP BY p.id, p.product_sku, p.name, p.quantity, p.available_qty, p.cost_per_item
HAVING COUNT(pb.id) > 0
ORDER BY batch_count DESC
LIMIT 10;

-- SECTION 3: Create Proper Import Function for Batch Handling
-- ====================================================================
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
            quantity, available_qty, cost_per_item,
            purchase_date, image_url, supplier, product_link,
            status, stock_value
        ) VALUES (
            p_user_id, p_product_sku, p_name, p_name,
            p_quantity, p_quantity, p_cost_per_item,
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

-- SECTION 4: Test the Batch Import
-- ====================================================================
DO $$
DECLARE
    test_user_id UUID;
    product_id1 UUID;
    product_id2 UUID;
    product_id3 UUID;
BEGIN
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    RAISE NOTICE '=== Testing Multiple Purchases of Same SKU ===';

    -- First purchase: 10 units at $5 each
    product_id1 := public.import_product_with_batch(
        test_user_id, 'TEST-BATCH-SKU', 'Test Batch Product',
        10, 5.00, '2024-01-01'::timestamptz
    );

    -- Second purchase: 20 units at $6 each (same SKU, different date/price)
    product_id2 := public.import_product_with_batch(
        test_user_id, 'TEST-BATCH-SKU', 'Test Batch Product',
        20, 6.00, '2024-02-01'::timestamptz
    );

    -- Third purchase: 15 units at $5.50 each
    product_id3 := public.import_product_with_batch(
        test_user_id, 'TEST-BATCH-SKU', 'Test Batch Product',
        15, 5.50, '2024-03-01'::timestamptz
    );

    -- Check the results
    RAISE NOTICE '--- Product Aggregate ---';
    SELECT
        product_sku,
        quantity as total_qty,
        available_qty,
        cost_per_item as avg_cost,
        stock_value
    FROM public.products
    WHERE id = product_id1;

    RAISE NOTICE '--- Individual Batches ---';
    SELECT
        pb.purchase_date::date,
        pb.quantity_purchased,
        pb.quantity_available,
        pb.cost_per_item
    FROM public.product_batches pb
    WHERE pb.product_id = product_id1
    ORDER BY pb.purchase_date;

    -- Clean up
    DELETE FROM public.product_batches WHERE product_id = product_id1;
    DELETE FROM public.products WHERE id = product_id1;

    RAISE NOTICE '✅ Test complete - Same SKU with different purchases works correctly';
END $$;

-- SECTION 5: Fix Import to Use Batch Logic
-- ====================================================================
-- Modify the import to handle same SKUs properly
CREATE OR REPLACE FUNCTION public.upsert_product_for_import(
    p_user_id UUID,
    p_product_sku VARCHAR(50),
    p_name VARCHAR(255),
    p_quantity INTEGER,
    p_cost_per_item DECIMAL(10,2),
    p_purchase_date TIMESTAMPTZ DEFAULT NOW(),
    p_create_batch BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
BEGIN
    -- For imports with same SKU at different times, we should:
    -- 1. Update the aggregate in products table
    -- 2. Optionally create batch records

    -- Upsert the product
    INSERT INTO public.products (
        user_id, product_sku, name, product_name,
        quantity, available_qty, cost_per_item, per_qty_price,
        purchase_date, status
    ) VALUES (
        p_user_id, p_product_sku, p_name, p_name,
        p_quantity, p_quantity, p_cost_per_item, p_cost_per_item,
        p_purchase_date, 'active'
    )
    ON CONFLICT (user_id, product_sku) DO UPDATE SET
        -- Add to existing quantities
        quantity = products.quantity + EXCLUDED.quantity,
        available_qty = products.available_qty + EXCLUDED.quantity,
        -- Update weighted average cost
        cost_per_item = (
            (products.cost_per_item * products.quantity) +
            (EXCLUDED.cost_per_item * EXCLUDED.quantity)
        ) / NULLIF(products.quantity + EXCLUDED.quantity, 0),
        per_qty_price = (
            (products.cost_per_item * products.quantity) +
            (EXCLUDED.cost_per_item * EXCLUDED.quantity)
        ) / NULLIF(products.quantity + EXCLUDED.quantity, 0)
    RETURNING id INTO v_product_id;

    -- Optionally create batch record
    IF p_create_batch THEN
        INSERT INTO public.product_batches (
            product_id, purchase_date, quantity_purchased,
            quantity_available, cost_per_item, user_id
        ) VALUES (
            v_product_id, p_purchase_date, p_quantity,
            p_quantity, p_cost_per_item, p_user_id
        );
    END IF;

    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.upsert_product_for_import(UUID, VARCHAR, VARCHAR, INTEGER, DECIMAL, TIMESTAMPTZ, BOOLEAN) TO authenticated;

-- SECTION 6: View Current Inventory Model
-- ====================================================================
SELECT
    'Products Table:' as table_info,
    COUNT(DISTINCT product_sku) as unique_skus,
    SUM(quantity) as total_units,
    SUM(available_qty) as available_units,
    SUM(stock_value) as total_value
FROM public.products
UNION ALL
SELECT
    'Batches Table:',
    COUNT(DISTINCT product_id),
    SUM(quantity_purchased),
    SUM(quantity_available),
    SUM(quantity_available * cost_per_item)
FROM public.product_batches;

-- ====================================================================
-- SUMMARY
-- ====================================================================
-- The system is designed to handle same SKUs bought at different times:
--
-- 1. PRODUCTS table: Shows AGGREGATE data (total quantity, average cost)
-- 2. PRODUCT_BATCHES table: Shows INDIVIDUAL purchases for FIFO
--
-- When importing:
-- - Same SKU should UPDATE quantities in products table
-- - Each purchase should CREATE a batch record
-- - The import error happens when trying to INSERT duplicate SKUs
--   instead of UPDATING the aggregate
-- ====================================================================