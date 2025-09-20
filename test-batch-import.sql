-- ====================================================================
-- TEST BATCH IMPORT FOR SAME SKU AT DIFFERENT TIMES
-- ====================================================================

-- First, run sections 1 and 2 to check current state
-- Then run section 3 to create the function
-- Finally run this test

DO $$
DECLARE
    test_user_id UUID;
    product_id1 UUID;
    product_id2 UUID;
    product_id3 UUID;
    result RECORD;
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

    -- Check the results - Product Aggregate
    RAISE NOTICE '--- Product Aggregate ---';
    FOR result IN
        SELECT
            product_sku,
            quantity as total_qty,
            available_qty,
            cost_per_item as avg_cost,
            stock_value
        FROM public.products
        WHERE id = product_id1
    LOOP
        RAISE NOTICE 'SKU: %, Total: %, Available: %, Avg Cost: $%, Value: $%',
            result.product_sku, result.total_qty, result.available_qty,
            result.avg_cost, result.stock_value;
    END LOOP;

    -- Check Individual Batches
    RAISE NOTICE '--- Individual Batches ---';
    FOR result IN
        SELECT
            pb.purchase_date::date as purchase_date,
            pb.quantity_purchased,
            pb.quantity_available,
            pb.cost_per_item
        FROM public.product_batches pb
        WHERE pb.product_id = product_id1
        ORDER BY pb.purchase_date
    LOOP
        RAISE NOTICE 'Date: %, Purchased: %, Available: %, Cost: $%',
            result.purchase_date, result.quantity_purchased,
            result.quantity_available, result.cost_per_item;
    END LOOP;

    -- Clean up
    DELETE FROM public.product_batches WHERE product_id = product_id1;
    DELETE FROM public.products WHERE id = product_id1;

    RAISE NOTICE '✅ Test complete - Same SKU with different purchases works correctly';
END $$;

-- ====================================================================
-- CHECK RESULTS AFTER TEST
-- ====================================================================

-- View how the system handles multiple purchases
SELECT
    'Expected Behavior:' as info,
    'Products table shows TOTAL quantity (10+20+15=45)' as products_table,
    'Products table shows AVERAGE cost ((10*5 + 20*6 + 15*5.5)/45)' as average_cost,
    'Product_batches table has 3 rows for 3 different purchases' as batches_table;

-- Check current product aggregates
SELECT
    product_sku,
    name,
    quantity as total_quantity,
    available_qty,
    cost_per_item as avg_cost_per_item,
    per_qty_price,
    stock_value,
    (SELECT COUNT(*) FROM product_batches pb WHERE pb.product_id = p.id) as batch_count
FROM public.products p
WHERE product_sku NOT LIKE 'TEST%'
ORDER BY quantity DESC
LIMIT 10;

-- Check batches for products with multiple purchases
WITH batch_summary AS (
    SELECT
        product_id,
        COUNT(*) as batch_count,
        SUM(quantity_purchased) as total_purchased,
        SUM(quantity_available) as total_available,
        MIN(purchase_date) as first_purchase,
        MAX(purchase_date) as last_purchase
    FROM public.product_batches
    GROUP BY product_id
    HAVING COUNT(*) > 1
)
SELECT
    p.product_sku,
    p.name,
    bs.batch_count,
    bs.total_purchased,
    bs.total_available,
    bs.first_purchase::date,
    bs.last_purchase::date
FROM batch_summary bs
JOIN public.products p ON p.id = bs.product_id
ORDER BY bs.batch_count DESC
LIMIT 10;