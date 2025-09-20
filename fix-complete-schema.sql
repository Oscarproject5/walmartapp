-- ====================================================================
-- FIX COMPLETE SCHEMA - COMPREHENSIVE FIXES
-- ====================================================================
-- This file contains all fixes needed to make the database work properly
-- Run this AFTER the main schema if you used complete-database-schema-FIXED.sql
-- OR run this if you have any issues with the original schema
-- ====================================================================

-- ====================================================================
-- SECTION 1: FIX FOREIGN KEY CONSTRAINTS
-- ====================================================================

-- Fix invitations table foreign keys (if missing)
DO $$
BEGIN
    -- Check and add created_by foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invitations_created_by_fkey'
    ) THEN
        ALTER TABLE public.invitations
        ADD CONSTRAINT invitations_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Check and add used_by foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invitations_used_by_fkey'
    ) THEN
        ALTER TABLE public.invitations
        ADD CONSTRAINT invitations_used_by_fkey
        FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Check and add profiles foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Fix products user_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'products_user_id_fkey'
    ) THEN
        ALTER TABLE public.products
        ADD CONSTRAINT products_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;

    -- Fix other tables' user_id foreign keys
    -- Product batches
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'product_batches_user_id_fkey'
    ) THEN
        ALTER TABLE public.product_batches
        ADD CONSTRAINT product_batches_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;

    -- App settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'app_settings_user_id_fkey'
    ) THEN
        ALTER TABLE public.app_settings
        ADD CONSTRAINT app_settings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;

    -- Orders
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_user_id_fkey'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;

    -- Order batch consumption
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'order_batch_consumption_user_id_fkey'
    ) THEN
        ALTER TABLE public.order_batch_consumption
        ADD CONSTRAINT order_batch_consumption_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_user_id_fkey'
    ) THEN
        ALTER TABLE public.sales
        ADD CONSTRAINT sales_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;

    -- Canceled orders
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'canceled_orders_user_id_fkey'
    ) THEN
        ALTER TABLE public.canceled_orders
        ADD CONSTRAINT canceled_orders_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;

    -- AI recommendations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ai_recommendations_user_id_fkey'
    ) THEN
        ALTER TABLE public.ai_recommendations
        ADD CONSTRAINT ai_recommendations_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- ====================================================================
-- SECTION 2: FIX INVITATION VALIDATION FUNCTIONS
-- ====================================================================

-- Create or replace the invitation validation function
CREATE OR REPLACE FUNCTION public.is_invitation_valid(invite_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitations
    WHERE
      code = invite_code AND
      status = 'active' AND
      (expires_at IS NULL OR expires_at > NOW()) AND
      used_by IS NULL
  );
END;
$$;

-- Create or replace the use invitation function
CREATE OR REPLACE FUNCTION public.use_invitation(invite_code TEXT, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO invite_record FROM public.invitations
  WHERE code = invite_code AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW());

  IF invite_record.id IS NULL OR invite_record.used_by IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.invitations
  SET
    used_by = user_id,
    used_at = NOW(),
    status = 'used'
  WHERE id = invite_record.id;

  IF invite_record.is_admin THEN
    UPDATE public.profiles
    SET is_admin = TRUE
    WHERE id = user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_invitation_valid(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_invitation(TEXT, UUID) TO anon, authenticated;

-- ====================================================================
-- SECTION 3: FIX RLS POLICIES
-- ====================================================================

-- Drop and recreate the critical invitation validation policy
DROP POLICY IF EXISTS "Anyone can validate invitation codes" ON public.invitations;
CREATE POLICY "Anyone can validate invitation codes"
ON public.invitations FOR SELECT
TO anon
USING (
  status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW())
  AND used_by IS NULL
);

-- ====================================================================
-- SECTION 4: FIX TRIGGER FOR AUTH.USERS
-- ====================================================================

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  invitation_record RECORD;
BEGIN
  -- Check if user used an invitation
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE used_by = NEW.id
  LIMIT 1;

  -- Count existing profiles (not users)
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Create profile
  INSERT INTO public.profiles (id, is_admin)
  VALUES (
    NEW.id,
    -- Admin if: first user OR used admin invitation
    (user_count = 0) OR (invitation_record.is_admin IS NOT NULL AND invitation_record.is_admin = true)
  )
  ON CONFLICT (id) DO UPDATE
  SET is_admin = CASE
    WHEN profiles.is_admin = true THEN true  -- Keep admin if already admin
    WHEN invitation_record.is_admin = true THEN true  -- Upgrade if invitation is admin
    ELSE profiles.is_admin
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to create trigger (may fail in Supabase, that's ok)
DO $$
BEGIN
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  -- Try to create trigger
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot create trigger on auth.users - will handle profile creation in application';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating trigger: % - will handle profile creation in application', SQLERRM;
END $$;

-- ====================================================================
-- SECTION 5: FIX FIFO FUNCTION PARAMETER
-- ====================================================================

-- Fix the consume_product_inventory_fifo function parameter type
DROP FUNCTION IF EXISTS public.consume_product_inventory_fifo(UUID, VARCHAR, INTEGER, TEXT, VARCHAR);

CREATE OR REPLACE FUNCTION public.consume_product_inventory_fifo(
    p_user_id UUID,
    p_product_sku VARCHAR(50),
    p_quantity_to_consume INTEGER,
    p_order_id TEXT,
    p_order_sku VARCHAR(255)  -- Fixed: proper length specification
)
RETURNS TABLE(consumed_cost DECIMAL(12, 2), quantity_consumed_total INTEGER) AS $$
DECLARE
    v_product_id UUID;
    v_batch RECORD;
    v_total_cost DECIMAL(12, 2) := 0;
    v_quantity_remaining_to_consume INTEGER := p_quantity_to_consume;
    v_quantity_consumed_from_batch INTEGER;
    v_total_quantity_consumed INTEGER := 0;
    v_total_available INTEGER;
    v_missing_quantity INTEGER;
    v_cost_per_unit DECIMAL(10, 2);
BEGIN
    -- Find the product ID and cost
    SELECT id, cost_per_item INTO v_product_id, v_cost_per_unit
    FROM public.products
    WHERE user_id = p_user_id AND product_sku = p_product_sku;

    IF v_product_id IS NULL THEN
        RAISE EXCEPTION 'Product SKU % not found for user %', p_product_sku, p_user_id;
    END IF;

    -- Check available quantity
    SELECT available_qty INTO v_total_available
    FROM public.products
    WHERE id = v_product_id;

    -- Auto-create inventory if needed
    IF v_total_available < p_quantity_to_consume THEN
        v_missing_quantity := p_quantity_to_consume - v_total_available;
        INSERT INTO public.product_batches (
            product_id, purchase_date, quantity_purchased, quantity_available, cost_per_item, user_id
        ) VALUES (
            v_product_id, NOW(), v_missing_quantity, v_missing_quantity, COALESCE(v_cost_per_unit, 0), p_user_id
        );
        RAISE NOTICE 'Auto-created inventory batch for SKU: % (User: %). Added % units.', p_product_sku, p_user_id, v_missing_quantity;
    END IF;

    -- Loop through batches (FIFO)
    FOR v_batch IN
        SELECT id, quantity_available, cost_per_item
        FROM public.product_batches
        WHERE product_id = v_product_id AND quantity_available > 0
        ORDER BY purchase_date ASC
    LOOP
        IF v_quantity_remaining_to_consume <= 0 THEN EXIT; END IF;

        v_quantity_consumed_from_batch := LEAST(v_quantity_remaining_to_consume, v_batch.quantity_available);

        -- Update batch quantity
        UPDATE public.product_batches
        SET quantity_available = quantity_available - v_quantity_consumed_from_batch
        WHERE id = v_batch.id;

        -- Record the consumption
        INSERT INTO public.order_batch_consumption (
            order_id, order_sku, product_batch_id, quantity_consumed, user_id
        ) VALUES (
            p_order_id, p_order_sku, v_batch.id, v_quantity_consumed_from_batch, p_user_id
        );

        v_total_cost := v_total_cost + (v_quantity_consumed_from_batch * v_batch.cost_per_item);
        v_quantity_remaining_to_consume := v_quantity_remaining_to_consume - v_quantity_consumed_from_batch;
        v_total_quantity_consumed := v_total_quantity_consumed + v_quantity_consumed_from_batch;
    END LOOP;

    IF v_total_quantity_consumed != p_quantity_to_consume THEN
       RAISE EXCEPTION 'Inventory consumption mismatch for SKU %. Required: %, Consumed: %.',
           p_product_sku, p_quantity_to_consume, v_total_quantity_consumed;
    END IF;

    consumed_cost := v_total_cost;
    quantity_consumed_total := v_total_quantity_consumed;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission on the fixed function
GRANT EXECUTE ON FUNCTION public.consume_product_inventory_fifo(UUID, VARCHAR, INTEGER, TEXT, VARCHAR) TO authenticated, service_role;

-- ====================================================================
-- SECTION 6: ENSURE FIRST ADMIN EXISTS
-- ====================================================================

-- Create the FIRSTADMIN invitation if it doesn't exist
INSERT INTO public.invitations (
    code,
    is_admin,
    status
) VALUES (
    'FIRSTADMIN',
    true,
    'active'
) ON CONFLICT (code) DO UPDATE
SET
    status = CASE
        WHEN invitations.used_by IS NOT NULL THEN invitations.status  -- Keep as is if used
        ELSE 'active'  -- Reactivate if not used
    END;

-- Create profiles for any existing auth users without profiles
INSERT INTO public.profiles (id, is_admin)
SELECT
    u.id,
    -- First user or FIRSTADMIN user becomes admin
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin = true) THEN true
        WHEN u.id IN (SELECT used_by FROM public.invitations WHERE code = 'FIRSTADMIN' AND is_admin = true) THEN true
        ELSE false
    END as is_admin
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Ensure at least one admin exists
DO $$
DECLARE
    admin_count INTEGER;
    first_user_id UUID;
BEGIN
    -- Count existing admins
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE is_admin = true;

    -- If no admin exists
    IF admin_count = 0 THEN
        -- Try to make the FIRSTADMIN invitation user an admin
        UPDATE public.profiles p
        SET is_admin = true
        FROM public.invitations i
        WHERE i.code = 'FIRSTADMIN'
            AND i.used_by IS NOT NULL
            AND p.id = i.used_by;

        -- If still no admin, make the first user an admin
        IF NOT FOUND THEN
            SELECT id INTO first_user_id
            FROM auth.users
            ORDER BY created_at ASC
            LIMIT 1;

            IF first_user_id IS NOT NULL THEN
                UPDATE public.profiles
                SET is_admin = true
                WHERE id = first_user_id;
            END IF;
        END IF;
    END IF;
END $$;

-- ====================================================================
-- SECTION 7: GRANT ALL NECESSARY PERMISSIONS
-- ====================================================================

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.create_default_app_settings(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_product_aggregates_from_batches() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_order_financials_and_consume_inventory() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_product_exists_for_order() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.return_inventory_on_order_delete() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

-- ====================================================================
-- SECTION 8: FINAL VERIFICATION
-- ====================================================================

-- Check foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('invitations', 'profiles', 'products', 'orders')
ORDER BY tc.table_name, tc.constraint_name;

-- Check if invitation functions exist
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('is_invitation_valid', 'use_invitation', 'handle_new_user');

-- Check admin status
SELECT
    'Admin Check' as check_type,
    COUNT(*) FILTER (WHERE is_admin = true) as admin_count,
    COUNT(*) as total_users
FROM public.profiles;

-- Check invitation status
SELECT
    'Invitation Check' as check_type,
    code,
    status,
    is_admin,
    CASE
        WHEN used_by IS NULL THEN 'Available'
        ELSE 'Used'
    END as availability
FROM public.invitations
WHERE code = 'FIRSTADMIN';

-- ====================================================================
-- END OF COMPREHENSIVE FIX
-- ====================================================================
-- This script ensures:
-- 1. All foreign key constraints are properly set
-- 2. Invitation validation functions work
-- 3. RLS policies allow invitation validation
-- 4. Profile creation triggers work (or fail gracefully)
-- 5. At least one admin user exists
-- 6. All permissions are granted
-- ====================================================================