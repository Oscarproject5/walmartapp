-- Migration to fix app_settings table and data
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first user from auth.users or create a default UUID
    SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        admin_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;

    -- Temporarily disable the not-null constraint
    ALTER TABLE public.app_settings 
    ALTER COLUMN user_id DROP NOT NULL;

    -- Update existing app_settings with no user_id
    UPDATE public.app_settings 
    SET user_id = admin_user_id
    WHERE user_id IS NULL;

    -- Re-enable the not-null constraint
    ALTER TABLE public.app_settings 
    ALTER COLUMN user_id SET NOT NULL;

    -- Create default settings for any users who don't have them
    INSERT INTO public.app_settings (
        shipping_base_cost,
        label_cost,
        cancellation_shipping_loss,
        minimum_profit_margin,
        auto_reorder_enabled,
        auto_price_adjustment_enabled,
        user_id
    )
    SELECT 
        5.00,
        1.00,
        5.00,
        10.00,
        FALSE,
        FALSE,
        u.id
    FROM auth.users u
    WHERE NOT EXISTS (
        SELECT 1 
        FROM public.app_settings a 
        WHERE a.user_id = u.id
    );

END
$$; 