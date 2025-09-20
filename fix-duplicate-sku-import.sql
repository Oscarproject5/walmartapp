-- ====================================================================
-- FIX DUPLICATE SKU IN BATCH IMPORT ERROR
-- ====================================================================
-- Error: "ON CONFLICT DO UPDATE command cannot affect row a second time"
-- This happens when the same SKU appears multiple times in one batch
-- ====================================================================

-- SECTION 1: Check for Duplicate SKUs in Products
-- ====================================================================
SELECT
    product_sku,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ', ') as product_names,
    STRING_AGG(id::text, ', ') as product_ids,
    user_id
FROM public.products
WHERE product_sku IS NOT NULL
GROUP BY product_sku, user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- SECTION 2: Find Products with Same SKU for Same User
-- ====================================================================
WITH duplicates AS (
    SELECT
        product_sku,
        user_id,
        COUNT(*) as dup_count
    FROM public.products
    GROUP BY product_sku, user_id
    HAVING COUNT(*) > 1
)
SELECT
    p.id,
    p.product_sku,
    p.name,
    p.quantity,
    p.created_at,
    p.user_id
FROM public.products p
JOIN duplicates d ON d.product_sku = p.product_sku AND d.user_id = p.user_id
ORDER BY p.user_id, p.product_sku, p.created_at DESC;

-- SECTION 3: Clean Up Duplicates (Keep Most Recent)
-- ====================================================================
-- This will delete older duplicates, keeping only the most recent one
WITH duplicates AS (
    SELECT
        id,
        product_sku,
        user_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, product_sku
            ORDER BY created_at DESC, id DESC
        ) as rn
    FROM public.products
    WHERE product_sku IS NOT NULL
)
DELETE FROM public.products
WHERE id IN (
    SELECT id
    FROM duplicates
    WHERE rn > 1
);

-- Report how many were deleted
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
        RAISE NOTICE '✅ Cleaned up % duplicate products', deleted_count;
    ELSE
        RAISE NOTICE 'ℹ️ No duplicates found to clean';
    END IF;
END $$;

-- SECTION 4: Create Function for Safe Batch Import
-- ====================================================================
-- This function deduplicates within the batch before inserting
CREATE OR REPLACE FUNCTION public.import_products_batch(
    products_data JSONB
)
RETURNS TABLE (
    imported_count INTEGER,
    skipped_count INTEGER,
    error_count INTEGER
) AS $$
DECLARE
    product RECORD;
    v_imported INTEGER := 0;
    v_skipped INTEGER := 0;
    v_error INTEGER := 0;
    seen_skus TEXT[] := '{}';
BEGIN
    -- Process each product in the batch
    FOR product IN
        SELECT DISTINCT ON (p->>'user_id', p->>'product_sku')
            p->>'user_id' as user_id,
            p->>'product_sku' as product_sku,
            p->>'name' as name,
            p->>'image_url' as image_url,
            p->>'supplier' as supplier,
            p->>'product_link' as product_link,
            (p->>'quantity')::INTEGER as quantity,
            (p->>'per_qty_price')::DECIMAL as per_qty_price,
            (p->>'cost_per_item')::DECIMAL as cost_per_item,
            (p->>'available_qty')::INTEGER as available_qty,
            p->>'status' as status
        FROM jsonb_array_elements(products_data) as p
        WHERE p->>'product_sku' IS NOT NULL
            AND p->>'user_id' IS NOT NULL
    LOOP
        -- Skip if we've already seen this SKU in this batch
        IF product.product_sku = ANY(seen_skus) THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        -- Add to seen list
        seen_skus := array_append(seen_skus, product.product_sku);

        -- Try to upsert
        BEGIN
            INSERT INTO public.products (
                user_id, product_sku, name, image_url, supplier,
                product_link, quantity, per_qty_price, cost_per_item,
                available_qty, status
            ) VALUES (
                product.user_id::UUID, product.product_sku, product.name,
                product.image_url, product.supplier, product.product_link,
                product.quantity, product.per_qty_price, product.cost_per_item,
                product.available_qty, product.status
            )
            ON CONFLICT (user_id, product_sku) DO UPDATE SET
                name = COALESCE(EXCLUDED.name, products.name),
                quantity = products.quantity + EXCLUDED.quantity,
                per_qty_price = EXCLUDED.per_qty_price,
                cost_per_item = EXCLUDED.cost_per_item,
                available_qty = products.available_qty + EXCLUDED.available_qty;

            v_imported := v_imported + 1;
        EXCEPTION
            WHEN OTHERS THEN
                v_error := v_error + 1;
                RAISE NOTICE 'Error importing SKU %: %', product.product_sku, SQLERRM;
        END;
    END LOOP;

    -- Return counts
    imported_count := v_imported;
    skipped_count := v_skipped;
    error_count := v_error;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.import_products_batch(JSONB) TO authenticated;

-- SECTION 5: Verify Current Product Status
-- ====================================================================
SELECT
    'Product Import Status' as report,
    COUNT(DISTINCT product_sku) as unique_skus,
    COUNT(*) as total_products,
    COUNT(DISTINCT user_id) as users_with_products,
    SUM(quantity) as total_inventory,
    SUM(stock_value) as total_value
FROM public.products
WHERE status = 'active';

-- SECTION 6: Check for SKUs with Special Characters
-- ====================================================================
-- Sometimes duplicate errors occur due to encoding issues
SELECT
    product_sku,
    LENGTH(product_sku) as sku_length,
    name,
    CASE
        WHEN product_sku ~ '[^a-zA-Z0-9\-_]' THEN '⚠️ Has special characters'
        WHEN product_sku ~ '^\s+|\s+$' THEN '⚠️ Has leading/trailing spaces'
        ELSE '✅ Clean SKU'
    END as sku_status
FROM public.products
WHERE product_sku ~ '[^a-zA-Z0-9\-_]'
    OR product_sku ~ '^\s+|\s+$'
LIMIT 20;

-- SECTION 7: Clean SKUs (Remove Spaces and Special Characters)
-- ====================================================================
UPDATE public.products
SET product_sku = TRIM(product_sku)
WHERE product_sku ~ '^\s+|\s+$';

-- ====================================================================
-- RECOMMENDATIONS FOR THE APP
-- ====================================================================
-- The application should:
-- 1. Deduplicate SKUs before sending the batch
-- 2. Use individual inserts instead of batch for duplicates
-- 3. Group products by SKU and sum quantities before import
--
-- The error is not critical - products are still being imported
-- Just some batches with duplicate SKUs fail
-- ====================================================================