-- Create a function to get batch data for a specific user
CREATE OR REPLACE FUNCTION public.get_batch_data(user_id_param UUID)
RETURNS TABLE (upload_batch_id VARCHAR, order_count BIGINT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.upload_batch_id,
    COUNT(*) AS order_count,
    MAX(o.created_at) AS created_at
  FROM 
    public.orders o
  WHERE 
    o.user_id = user_id_param
    AND o.upload_batch_id IS NOT NULL
  GROUP BY 
    o.upload_batch_id
  ORDER BY 
    MAX(o.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment to the function
COMMENT ON FUNCTION public.get_batch_data(UUID) IS 'Gets batch upload data for a specific user, showing batch ID, order count, and creation date';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_batch_data(UUID) TO authenticated, anon, postgres; 