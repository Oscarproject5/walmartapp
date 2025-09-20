-- ====================================================================
-- DIAGNOSE PRODUCT IMPORT 400 ERROR
-- ====================================================================
-- Run these queries to understand why product imports are failing
-- ====================================================================

-- 1. Check if your user has a valid profile
SELECT
    u.id as user_id,
    u.email,
    p.id as profile_id,
    p.is_admin,
    CASE
        WHEN p.id IS NULL THEN 'MISSING PROFILE - FIX NEEDED'
        ELSE 'Profile OK'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- 2. Check current products for your user
SELECT
    COUNT(*) as product_count,
    COUNT(DISTINCT product_sku) as unique_skus,
    COUNT(*) FILTER (WHERE product_sku IS NULL) as null_skus,
    COUNT(*) FILTER (WHERE product_sku = '') as empty_skus,
    user_id
FROM public.products
GROUP BY user_id;

-- 3. Check for any products with issues
SELECT
    id,
    product_sku,
    name,
    user_id,
    created_at,
    CASE
        WHEN product_sku IS NULL THEN 'NULL SKU'
        WHEN product_sku = '' THEN 'EMPTY SKU'
        WHEN user_id IS NULL THEN 'NULL USER'
        ELSE 'OK'
    END as issue
FROM public.products
WHERE product_sku IS NULL
    OR product_sku = ''
    OR user_id IS NULL
LIMIT 10;

-- 4. Check RLS policies on products table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'products'
ORDER BY cmd;

-- 5. Test if you can insert a product manually (replace with your user_id)
DO $$
DECLARE
    test_user_id UUID;
    test_result UUID;
BEGIN
    -- Get the current user id
    SELECT id INTO test_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;

    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found!';
    ELSE
        -- Try a simple insert
        BEGIN
            INSERT INTO public.products (
                user_id,
                product_sku,
                name,
                quantity,
                cost_per_item,
                available_qty,
                status
            ) VALUES (
                test_user_id,
                'TEST-IMPORT-' || NOW()::text,
                'Test Product for Import Debug',
                1,
                1.00,
                1,
                'active'
            )
            RETURNING id INTO test_result;

            RAISE NOTICE 'SUCCESS: Created test product with ID: %', test_result;

            -- Clean up
            DELETE FROM public.products WHERE id = test_result;
            RAISE NOTICE 'Test product cleaned up';

        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'FAILED to insert: %', SQLERRM;
                RAISE NOTICE 'This is likely the same error your app is getting';
        END;
    END IF;
END $$;

-- 6. Check if the orders table foreign key is causing issues
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name = 'orders' OR ccu.table_name = 'products');

-- 7. Check for conflicting unique constraints
SELECT
    n.nspname as schema_name,
    t.relname as table_name,
    i.relname as index_name,
    array_to_string(array_agg(a.attname ORDER BY x.n), ', ') as columns,
    pg_get_expr(ix.indpred, ix.indrelid) as predicate,
    ix.indisunique as is_unique
FROM pg_namespace n
JOIN pg_class t ON t.relnamespace = n.oid
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON ix.indexrelid = i.oid
CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, n)
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
WHERE n.nspname = 'public'
    AND t.relname = 'products'
    AND ix.indisunique = true
GROUP BY n.nspname, t.relname, i.relname, ix.indpred, ix.indisunique;

-- ====================================================================
-- COMMON FIXES BASED ON RESULTS
-- ====================================================================

-- FIX 1: If profile is missing for user
-- INSERT INTO public.profiles (id, is_admin)
-- SELECT id, false FROM auth.users
-- WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id);

-- FIX 2: If RLS is blocking (temporarily disable for testing)
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
-- Note: Re-enable with: ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- FIX 3: If foreign key constraint is the issue
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_sku_fkey;

-- ====================================================================
-- APP-SIDE DEBUGGING
-- ====================================================================
-- The error "on_conflict=user_id%2Cproduct_sku" in the URL suggests the app is:
-- 1. Trying to use UPSERT with conflict resolution
-- 2. Expecting (user_id, product_sku) to be unique together
--
-- Make sure your app is:
-- 1. Sending user_id with each product
-- 2. Sending non-null product_sku values
-- 3. Authenticated (so auth.uid() returns the user_id)
-- ====================================================================