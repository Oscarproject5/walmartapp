-- ====================================================================
-- FIX PRODUCT IMPORT ISSUES
-- ====================================================================
-- This file fixes the 400 errors when importing products
-- Run this in Supabase SQL Editor to fix product import issues
-- ====================================================================

-- 1. Check current constraints on products table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'products'
    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- 2. Check if the composite unique constraint exists
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE nsp.nspname = 'public'
    AND cls.relname = 'products'
    AND con.contype = 'u';

-- 3. Drop and recreate the constraint properly
DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_user_id_product_sku_key;

    -- Recreate with proper definition
    ALTER TABLE public.products
    ADD CONSTRAINT products_user_id_product_sku_key
    UNIQUE (user_id, product_sku);

    RAISE NOTICE 'Recreated composite unique constraint on products(user_id, product_sku)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error recreating constraint: %', SQLERRM;
END $$;

-- 4. Ensure product_sku column allows NULL (for flexibility)
ALTER TABLE public.products
ALTER COLUMN product_sku DROP NOT NULL;

-- 5. Create a function to safely upsert products
CREATE OR REPLACE FUNCTION public.upsert_product(
    p_user_id UUID,
    p_product_sku VARCHAR(50),
    p_name VARCHAR(255),
    p_image_url TEXT DEFAULT NULL,
    p_supplier VARCHAR(100) DEFAULT NULL,
    p_product_link TEXT DEFAULT NULL,
    p_quantity INTEGER DEFAULT 0,
    p_cost_per_item DECIMAL(10,2) DEFAULT 0,
    p_status VARCHAR(50) DEFAULT 'active'
)
RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
BEGIN
    -- Check if product_sku is provided
    IF p_product_sku IS NULL OR p_product_sku = '' THEN
        RAISE EXCEPTION 'product_sku cannot be null or empty';
    END IF;

    -- Try to update existing product
    UPDATE public.products
    SET
        name = p_name,
        image_url = COALESCE(p_image_url, image_url),
        supplier = COALESCE(p_supplier, supplier),
        product_link = COALESCE(p_product_link, product_link),
        quantity = p_quantity,
        cost_per_item = p_cost_per_item,
        status = p_status,
        product_name = p_name
    WHERE user_id = p_user_id
        AND product_sku = p_product_sku
    RETURNING id INTO v_product_id;

    -- If no update, insert new
    IF v_product_id IS NULL THEN
        INSERT INTO public.products (
            user_id,
            product_sku,
            name,
            product_name,
            image_url,
            supplier,
            product_link,
            quantity,
            cost_per_item,
            status,
            available_qty,
            sales_qty,
            stock_value
        ) VALUES (
            p_user_id,
            p_product_sku,
            p_name,
            p_name,
            p_image_url,
            p_supplier,
            p_product_link,
            p_quantity,
            p_cost_per_item,
            p_status,
            p_quantity,  -- Initially all quantity is available
            0,           -- No sales initially
            p_quantity * p_cost_per_item  -- Calculate stock value
        )
        RETURNING id INTO v_product_id;
    END IF;

    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_product(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT, INTEGER, DECIMAL, VARCHAR) TO authenticated;

-- 6. Check and fix any products with NULL user_id
UPDATE public.products
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- 7. Ensure RLS policies allow inserts and updates
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
CREATE POLICY "Users can insert their own products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products"
ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Create an index on product_sku for better performance
CREATE INDEX IF NOT EXISTS idx_products_product_sku
ON public.products(product_sku);

CREATE INDEX IF NOT EXISTS idx_products_user_id_product_sku
ON public.products(user_id, product_sku);

-- 9. Verify the fix
SELECT
    'Constraint Check' as check_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
    AND table_name = 'products'
    AND constraint_type = 'UNIQUE';

-- 10. Test the upsert function (replace with your actual user_id)
DO $$
DECLARE
    test_user_id UUID;
    test_product_id UUID;
BEGIN
    -- Get the first user's ID for testing
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Test upsert
        test_product_id := public.upsert_product(
            test_user_id,
            'TEST-SKU-001',
            'Test Product',
            'https://example.com/image.jpg',
            'Test Supplier',
            'https://example.com/product',
            10,
            9.99,
            'active'
        );

        RAISE NOTICE 'Test product created/updated with ID: %', test_product_id;

        -- Clean up test
        DELETE FROM public.products
        WHERE id = test_product_id;

        RAISE NOTICE 'Test completed successfully';
    ELSE
        RAISE NOTICE 'No users found for testing';
    END IF;
END $$;

-- ====================================================================
-- TROUBLESHOOTING SECTION
-- ====================================================================

-- If still getting errors, check these:

-- 1. Check for duplicate product_sku values for the same user
SELECT
    user_id,
    product_sku,
    COUNT(*) as duplicate_count
FROM public.products
GROUP BY user_id, product_sku
HAVING COUNT(*) > 1;

-- 2. Clean up any duplicates (keeps the most recent)
DELETE FROM public.products p1
USING public.products p2
WHERE p1.user_id = p2.user_id
    AND p1.product_sku = p2.product_sku
    AND p1.created_at < p2.created_at;

-- 3. Check for products with NULL or empty product_sku
SELECT
    id,
    name,
    product_sku,
    user_id
FROM public.products
WHERE product_sku IS NULL
    OR product_sku = '';

-- 4. Fix NULL product_sku values (generate from name or SKU)
UPDATE public.products
SET product_sku = COALESCE(sku, 'SKU-' || LEFT(MD5(name || id::text), 8))
WHERE product_sku IS NULL OR product_sku = '';

-- ====================================================================
-- END OF PRODUCT IMPORT FIX
-- ====================================================================