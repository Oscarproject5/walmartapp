-- ====================================================================
-- SIMPLE PRODUCT IMPORT DIAGNOSTIC
-- ====================================================================
-- Run each section separately to diagnose the import issue
-- ====================================================================

-- SECTION 1: Check User and Profile
-- ====================================================================
SELECT
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.is_admin,
    CASE
        WHEN p.id IS NULL THEN '❌ MISSING PROFILE - FIX NEEDED'
        ELSE '✅ Profile OK'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- SECTION 2: Check Products Table Status
-- ====================================================================
SELECT
    COUNT(*) as total_products,
    COUNT(DISTINCT user_id) as users_with_products,
    COUNT(*) FILTER (WHERE product_sku IS NULL) as null_skus,
    COUNT(*) FILTER (WHERE product_sku = '') as empty_skus
FROM public.products;

-- SECTION 3: Check RLS Status
-- ====================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    CASE
        WHEN cmd = 'INSERT' THEN '📝 Insert'
        WHEN cmd = 'UPDATE' THEN '✏️ Update'
        WHEN cmd = 'DELETE' THEN '🗑️ Delete'
        WHEN cmd = 'SELECT' THEN '👁️ Select'
    END as policy_type
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd;

-- SECTION 4: Test Manual Insert
-- ====================================================================
DO $$
DECLARE
    test_user_id UUID;
    test_product_id UUID;
BEGIN
    -- Get the most recent user
    SELECT id INTO test_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;

    RAISE NOTICE '=================================';
    RAISE NOTICE 'Testing with user: %', test_user_id;
    RAISE NOTICE '=================================';

    -- Try to insert a test product
    BEGIN
        INSERT INTO public.products (
            user_id,
            product_sku,
            name,
            product_name,
            quantity,
            cost_per_item,
            available_qty,
            status
        ) VALUES (
            test_user_id,
            'TEST-' || substr(gen_random_uuid()::text, 1, 8),
            'Test Product',
            'Test Product',
            1,
            1.00,
            1,
            'active'
        )
        RETURNING id INTO test_product_id;

        RAISE NOTICE '✅ SUCCESS: Created product with ID: %', test_product_id;

        -- Clean up
        DELETE FROM public.products WHERE id = test_product_id;
        RAISE NOTICE '🧹 Cleaned up test product';

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ FAILED: %', SQLERRM;
            RAISE NOTICE 'Error Code: %', SQLSTATE;
    END;
END $$;

-- SECTION 5: Check Unique Constraints
-- ====================================================================
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE cls.relname = 'products'
    AND con.contype = 'u';

-- SECTION 6: Check Foreign Key References
-- ====================================================================
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS references_table,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
    AND (conrelid::regclass::text = 'orders' OR confrelid::regclass::text = 'products');

-- SECTION 7: Quick Fix - Disable RLS Temporarily
-- ====================================================================
-- Run this only if you want to test without RLS:
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- SECTION 8: Create Missing Profile if Needed
-- ====================================================================
INSERT INTO public.profiles (id, is_admin)
SELECT u.id, false
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- SECTION 9: Final Check - Can We Upsert?
-- ====================================================================
DO $$
DECLARE
    test_user_id UUID;
    result_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    -- Test upsert with ON CONFLICT
    INSERT INTO public.products (
        user_id,
        product_sku,
        name,
        product_name,
        quantity,
        cost_per_item,
        status
    ) VALUES (
        test_user_id,
        'UPSERT-TEST',
        'Upsert Test Product',
        'Upsert Test Product',
        10,
        5.99,
        'active'
    )
    ON CONFLICT (user_id, product_sku)
    DO UPDATE SET
        name = EXCLUDED.name,
        quantity = EXCLUDED.quantity,
        cost_per_item = EXCLUDED.cost_per_item
    RETURNING id INTO result_id;

    IF result_id IS NOT NULL THEN
        RAISE NOTICE '✅ UPSERT WORKS! Product ID: %', result_id;
        -- Clean up
        DELETE FROM public.products WHERE id = result_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ UPSERT FAILED: %', SQLERRM;
        RAISE NOTICE 'This is likely your import error!';
END $$;

-- ====================================================================
-- MOST LIKELY FIXES
-- ====================================================================
-- Based on the error pattern, try these in order:

-- 1. Make sure profile exists (Section 8 does this)

-- 2. Temporarily disable RLS to test:
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 3. Check if the app is sending the correct user_id
--    The app might not be including auth.uid() in the request

-- 4. Remove the orders foreign key if it exists:
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_sku_fkey;