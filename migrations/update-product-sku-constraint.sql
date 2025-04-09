-- First, drop the foreign key constraint in the orders table
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_sku_fkey;

-- Now drop the existing product_sku constraint
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_product_sku_key;

-- Add a new composite constraint that combines user_id and product_sku
ALTER TABLE products
ADD CONSTRAINT products_user_id_product_sku_key UNIQUE (user_id, product_sku);

-- Add a non-unique index on product_sku to maintain performance
CREATE INDEX IF NOT EXISTS products_product_sku_idx ON products(product_sku);

-- Make sure the orders table has user_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN user_id UUID;
        
        -- Copy user_id from products to orders where SKUs match
        UPDATE orders o
        SET user_id = p.user_id
        FROM products p
        WHERE o.sku = p.product_sku;
        
        -- Make user_id NOT NULL after populating data
        ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;
    END IF;
END
$$;

-- Recreate the foreign key constraint on orders table using both user_id and sku
ALTER TABLE orders
ADD CONSTRAINT orders_user_id_sku_fkey
FOREIGN KEY (user_id, sku) REFERENCES products(user_id, product_sku);

-- This allows different users to have the same SKU
-- while preventing duplicates for the same user 