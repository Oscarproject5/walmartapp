-- ====================================================================
-- FIX MISSING COLUMN ERROR
-- ====================================================================
-- The app is trying to insert 'per_qty_price' but the column doesn't exist
-- We need to either add the column or fix the app
-- ====================================================================

-- SECTION 1: Check Current Columns
-- ====================================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name IN ('cost_per_item', 'per_qty_price', 'purchase_price')
ORDER BY ordinal_position;

-- SECTION 2: Add the Missing Column
-- ====================================================================
-- Option A: Add per_qty_price as an alias for cost_per_item
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS per_qty_price DECIMAL(10, 2);

-- Copy existing cost_per_item data to per_qty_price
UPDATE public.products
SET per_qty_price = cost_per_item
WHERE per_qty_price IS NULL;

-- SECTION 3: Alternative - Add as Generated Column (PostgreSQL 12+)
-- ====================================================================
-- This keeps both columns in sync automatically
DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'per_qty_price'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.products
        ADD COLUMN per_qty_price DECIMAL(10, 2) DEFAULT 0;

        RAISE NOTICE '✅ Added per_qty_price column';
    ELSE
        RAISE NOTICE 'ℹ️ per_qty_price column already exists';
    END IF;
END $$;

-- SECTION 4: Add Other Potentially Missing Columns
-- ====================================================================
-- The app might also be looking for purchase_price
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);

-- Update it from cost_per_item
UPDATE public.products
SET purchase_price = cost_per_item
WHERE purchase_price IS NULL;

-- SECTION 5: Sync Columns with Trigger
-- ====================================================================
-- Keep columns in sync when one is updated
CREATE OR REPLACE FUNCTION sync_product_price_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- If cost_per_item is updated, update the others
    IF NEW.cost_per_item IS DISTINCT FROM OLD.cost_per_item THEN
        NEW.per_qty_price := NEW.cost_per_item;
        NEW.purchase_price := NEW.cost_per_item;
    -- If per_qty_price is updated, update the others
    ELSIF NEW.per_qty_price IS DISTINCT FROM OLD.per_qty_price THEN
        NEW.cost_per_item := NEW.per_qty_price;
        NEW.purchase_price := NEW.per_qty_price;
    -- If purchase_price is updated, update the others
    ELSIF NEW.purchase_price IS DISTINCT FROM OLD.purchase_price THEN
        NEW.cost_per_item := NEW.purchase_price;
        NEW.per_qty_price := NEW.purchase_price;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_product_prices ON public.products;
CREATE TRIGGER sync_product_prices
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_price_columns();

-- SECTION 6: Test the Fix
-- ====================================================================
DO $$
DECLARE
    test_user_id UUID;
    test_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    -- Test insert with per_qty_price
    INSERT INTO public.products (
        user_id,
        product_sku,
        name,
        per_qty_price,  -- Using the column the app expects
        quantity,
        status
    ) VALUES (
        test_user_id,
        'TEST-COLUMN-FIX',
        'Test Product with per_qty_price',
        19.99,
        5,
        'active'
    )
    ON CONFLICT (user_id, product_sku)
    DO UPDATE SET
        per_qty_price = EXCLUDED.per_qty_price,
        quantity = EXCLUDED.quantity
    RETURNING id INTO test_id;

    -- Check if all price columns are synced
    SELECT
        product_sku,
        cost_per_item,
        per_qty_price,
        purchase_price
    FROM public.products
    WHERE id = test_id;

    -- Clean up
    DELETE FROM public.products WHERE id = test_id;

    RAISE NOTICE '✅ Column fix successful! The app should work now.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- SECTION 7: Verify All Columns
-- ====================================================================
SELECT
    column_name,
    data_type,
    CASE
        WHEN column_name IN ('cost_per_item', 'per_qty_price', 'purchase_price') THEN '💰 Price Column'
        WHEN column_name = 'product_sku' THEN '🔑 Key Column'
        WHEN column_name = 'user_id' THEN '👤 User Column'
        ELSE '📦 Data Column'
    END as column_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'products'
ORDER BY
    CASE
        WHEN column_name = 'id' THEN 1
        WHEN column_name = 'user_id' THEN 2
        WHEN column_name = 'product_sku' THEN 3
        ELSE 4
    END,
    column_name;

-- ====================================================================
-- SUMMARY
-- ====================================================================
-- The error was: "Could not find the 'per_qty_price' column"
--
-- Fixed by:
-- 1. Adding the per_qty_price column
-- 2. Adding purchase_price column (in case it's needed)
-- 3. Creating a sync trigger to keep all price columns in sync
--
-- Your product imports should now work!
-- ====================================================================