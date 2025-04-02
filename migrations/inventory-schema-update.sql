-- Inventory Schema Update for Walmart App

-- Alter the products table to add additional fields for enhanced inventory management
ALTER TABLE IF EXISTS public.products 
ADD COLUMN IF NOT EXISTS sku VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_sku VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS supplier VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_link TEXT,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS sales_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS per_qty_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS stock_value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Update existing products to calculate stock value based on quantity and cost
UPDATE public.products 
SET 
    product_name = name,
    purchase_price = cost_per_item,
    available_qty = quantity,
    per_qty_price = cost_per_item,
    stock_value = quantity * cost_per_item,
    supplier = source,
    status = 'active';

-- Create a view for the inventory display
CREATE OR REPLACE VIEW public.inventory_view AS
SELECT 
    id,
    sku,
    product_sku,
    product_name,
    image_url,
    supplier,
    product_link,
    purchase_price,
    quantity AS total_qty,
    sales_qty,
    available_qty,
    per_qty_price,
    stock_value,
    status,
    remarks,
    created_at
FROM 
    public.products;

-- Create function to update stock_value when quantity or cost changes
CREATE OR REPLACE FUNCTION update_stock_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.stock_value := NEW.quantity * NEW.cost_per_item;
    NEW.available_qty := NEW.quantity - COALESCE(NEW.sales_qty, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock_value
DROP TRIGGER IF EXISTS update_stock_value_trigger ON public.products;
CREATE TRIGGER update_stock_value_trigger
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_stock_value();

-- Create a function to update the sales_qty on the products table when a sale is created or updated
CREATE OR REPLACE FUNCTION update_product_sales_qty()
RETURNS TRIGGER AS $$
BEGIN
    -- If inserting or updating a sale
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.product_id = NEW.product_id) THEN
        -- Update the product's sales_qty
        UPDATE public.products
        SET sales_qty = COALESCE((
            SELECT SUM(quantity_sold)
            FROM public.sales
            WHERE product_id = NEW.product_id
            AND status = 'active'
        ), 0),
        available_qty = quantity - COALESCE((
            SELECT SUM(quantity_sold)
            FROM public.sales
            WHERE product_id = NEW.product_id
            AND status = 'active'
        ), 0)
        WHERE id = NEW.product_id;
    END IF;
    
    -- If deleting a sale or updating a sale's product_id
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.product_id != NEW.product_id) THEN
        -- Update the old product's sales_qty
        UPDATE public.products
        SET sales_qty = COALESCE((
            SELECT SUM(quantity_sold)
            FROM public.sales
            WHERE product_id = OLD.product_id
            AND status = 'active'
        ), 0),
        available_qty = quantity - COALESCE((
            SELECT SUM(quantity_sold)
            FROM public.sales
            WHERE product_id = OLD.product_id
            AND status = 'active'
        ), 0)
        WHERE id = OLD.product_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sales updates
DROP TRIGGER IF EXISTS update_product_sales_qty_insert_trigger ON public.sales;
CREATE TRIGGER update_product_sales_qty_insert_trigger
AFTER INSERT OR UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION update_product_sales_qty();

DROP TRIGGER IF EXISTS update_product_sales_qty_delete_trigger ON public.sales;
CREATE TRIGGER update_product_sales_qty_delete_trigger
AFTER DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION update_product_sales_qty();

-- Sample data with SKUs and extended fields
INSERT INTO public.products (
    sku, 
    product_sku, 
    name, 
    product_name, 
    quantity, 
    cost_per_item, 
    purchase_price,
    per_qty_price,
    purchase_date, 
    source, 
    supplier,
    available_qty,
    sales_qty,
    stock_value,
    status,
    remarks
)
VALUES
    (
        'WM-TECH-0001', 
        'WM-TECH-0001', 
        'Premium Wireless Headphones', 
        'Premium Wireless Headphones', 
        35, 
        30.00, 
        30.00,
        30.00,
        NOW() - INTERVAL '20 days', 
        'walmart', 
        'Walmart',
        35,
        0,
        1050.00,
        'active',
        'High demand product'
    ),
    (
        'AMZN-TECH-0002', 
        'AMZN-TECH-0002', 
        'Bluetooth Speaker System', 
        'Bluetooth Speaker System', 
        22, 
        45.00, 
        45.00,
        45.00,
        NOW() - INTERVAL '15 days', 
        'amazon', 
        'Amazon',
        22,
        0,
        990.00,
        'active',
        'Good profit margin'
    ),
    (
        'SC-HOME-0003', 
        'SC-HOME-0003', 
        'Kitchen Mixer Pro', 
        'Kitchen Mixer Pro', 
        18, 
        60.00, 
        60.00,
        60.00,
        NOW() - INTERVAL '10 days', 
        'sams_club', 
        'Sam''s Club',
        18,
        0,
        1080.00,
        'low_stock',
        'Consider reordering'
    ),
    (
        'WM-OFFICE-0004', 
        'WM-OFFICE-0004', 
        'Ergonomic Office Chair', 
        'Ergonomic Office Chair', 
        12, 
        80.00, 
        80.00,
        80.00,
        NOW() - INTERVAL '5 days', 
        'walmart', 
        'Walmart',
        12,
        0,
        960.00,
        'active',
        'Shipping takes longer'
    );

-- Update TypeScript type definitions
COMMENT ON TABLE public.products IS 'Products inventory with extended fields for SKU, supplier, and more'; 