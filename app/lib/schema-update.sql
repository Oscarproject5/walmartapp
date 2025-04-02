-- Add new columns to the sales table
ALTER TABLE sales
ADD COLUMN purchase_order_number TEXT,
ADD COLUMN ship_by_date DATE,
ADD COLUMN order_number TEXT,
ADD COLUMN fulfilled_by TEXT,
ADD COLUMN ship_node TEXT,
ADD COLUMN ship_node_id TEXT,
ADD COLUMN ship_method TEXT,
ADD COLUMN carrier_method TEXT,
ADD COLUMN item_condition TEXT;

-- Create an index on order_number for faster lookups
CREATE INDEX idx_sales_order_number ON sales(order_number);

-- Create an index on purchase_order_number for faster lookups
CREATE INDEX idx_sales_purchase_order_number ON sales(purchase_order_number);

-- Add comment to explain the purpose of these columns
COMMENT ON COLUMN sales.purchase_order_number IS 'Walmart purchase order number';
COMMENT ON COLUMN sales.ship_by_date IS 'Date by which the order must be shipped';
COMMENT ON COLUMN sales.order_number IS 'Walmart order number';
COMMENT ON COLUMN sales.fulfilled_by IS 'Entity fulfilling the order (Self, Walmart, etc.)';
COMMENT ON COLUMN sales.ship_node IS 'Shipping origin location name';
COMMENT ON COLUMN sales.ship_node_id IS 'Shipping origin location ID';
COMMENT ON COLUMN sales.ship_method IS 'Shipping method (Standard, Express, etc.)';
COMMENT ON COLUMN sales.carrier_method IS 'Shipping carrier (USPS, FedEx, UPS, etc.)';
COMMENT ON COLUMN sales.item_condition IS 'Condition of item (New, Used, Refurbished, etc.)'; 