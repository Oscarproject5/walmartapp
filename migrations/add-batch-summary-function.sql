-- Create a function to get order batch summary information
CREATE OR REPLACE FUNCTION public.get_batch_summary()
RETURNS TABLE (
    upload_batch_id UUID,
    order_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.upload_batch_id,
        COUNT(*) AS order_count,
        MIN(o.created_at) AS created_at -- Using the earliest order in the batch
    FROM 
        public.orders o
    WHERE 
        o.upload_batch_id IS NOT NULL
    GROUP BY 
        o.upload_batch_id
    ORDER BY 
        MIN(o.created_at) DESC;
END;
$$ LANGUAGE plpgsql; 