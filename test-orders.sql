-- Count all orders
SELECT COUNT(*) AS total_orders FROM public.orders;

-- Show 10 sample orders with their columns
SELECT * FROM public.orders LIMIT 10;

-- Check if user_id column exists in orders table
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'user_id';

-- Look for NULL or empty user_id values
SELECT 
    COUNT(*) AS null_user_ids
FROM 
    public.orders
WHERE 
    user_id IS NULL; 