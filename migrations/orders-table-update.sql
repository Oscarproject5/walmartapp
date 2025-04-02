-- Migration script to update the Orders table to the new schema
-- This script will drop and recreate the Orders table with the new structure

DO $$ 
BEGIN
  -- Check if the table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- Drop existing orders table
    DROP TABLE public.orders CASCADE;
    RAISE NOTICE 'Existing orders table dropped';
  END IF;
END $$;

-- Create the new orders table with the updated schema
CREATE TABLE public.orders (
  -- Primary key
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Fields uploaded via Excel (manually imported by user)
  order_date TIMESTAMPTZ NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  product_name VARCHAR(255),
  order_quantity INTEGER NOT NULL,
  walmart_price_per_unit DECIMAL(10, 2) NOT NULL,
  walmart_shipping_fee_per_unit DECIMAL(10, 2) NOT NULL,
  
  -- Fields linked to inventory or settings (used in calculations)
  product_cost_per_unit DECIMAL(10, 2) NOT NULL,
  fulfillment_cost DECIMAL(10, 2) NOT NULL,
  
  -- Fields calculated automatically in the backend
  walmart_shipping_total DECIMAL(12, 2) GENERATED ALWAYS AS (walmart_shipping_fee_per_unit * order_quantity) STORED,
  walmart_item_total DECIMAL(12, 2) GENERATED ALWAYS AS (walmart_price_per_unit * order_quantity) STORED,
  total_revenue DECIMAL(12, 2) GENERATED ALWAYS AS (walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) STORED,
  walmart_fee DECIMAL(12, 2) GENERATED ALWAYS AS ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08) STORED,
  product_cost_total DECIMAL(12, 2) GENERATED ALWAYS AS (product_cost_per_unit * order_quantity) STORED,
  net_profit DECIMAL(12, 2) GENERATED ALWAYS AS (
    (walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) - 
    (product_cost_per_unit * order_quantity) - fulfillment_cost - 
    ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)
  ) STORED,
  roi DECIMAL(6, 2) GENERATED ALWAYS AS (
    (
      (walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) - 
      (product_cost_per_unit * order_quantity) - fulfillment_cost - 
      ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)
    ) / 
    (fulfillment_cost + (product_cost_per_unit * order_quantity) + 
     ((walmart_price_per_unit * order_quantity + walmart_shipping_fee_per_unit * order_quantity) * 0.08)) * 100
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint linking to products table
ALTER TABLE public.orders
  ADD CONSTRAINT orders_sku_fkey FOREIGN KEY (sku) 
  REFERENCES public.products(product_sku) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indices for quick lookups
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_orders_sku ON public.orders(sku);
CREATE INDEX idx_orders_customer_name ON public.orders(customer_name);

-- Add comments to explain the table structure
COMMENT ON TABLE public.orders IS 'Orders table with revised schema separating upload fields from calculated fields';
COMMENT ON COLUMN public.orders.order_id IS 'Unique order identifier (Primary Key)';
COMMENT ON COLUMN public.orders.order_date IS 'Date the order was placed';
COMMENT ON COLUMN public.orders.customer_name IS 'Customer''s name (for reporting/search)';
COMMENT ON COLUMN public.orders.sku IS 'Product SKU (linked to inventory)';
COMMENT ON COLUMN public.orders.product_name IS 'Product name (shown for convenience)';
COMMENT ON COLUMN public.orders.order_quantity IS 'Number of units ordered';
COMMENT ON COLUMN public.orders.walmart_price_per_unit IS 'Sale price per item (from Walmart)';
COMMENT ON COLUMN public.orders.walmart_shipping_fee_per_unit IS 'Shipping charged to the customer (per item)';
COMMENT ON COLUMN public.orders.product_cost_per_unit IS 'Pulled from inventory (cost per unit of product)';
COMMENT ON COLUMN public.orders.fulfillment_cost IS 'Pulled from app settings (fixed or per item)';
COMMENT ON COLUMN public.orders.walmart_shipping_total IS 'Calculated: walmart_shipping_fee_per_unit × order_quantity';
COMMENT ON COLUMN public.orders.walmart_item_total IS 'Calculated: walmart_price_per_unit × order_quantity';
COMMENT ON COLUMN public.orders.total_revenue IS 'Calculated: walmart_item_total + walmart_shipping_total';
COMMENT ON COLUMN public.orders.walmart_fee IS 'Calculated: total_revenue × 0.08';
COMMENT ON COLUMN public.orders.product_cost_total IS 'Calculated: product_cost_per_unit × order_quantity';
COMMENT ON COLUMN public.orders.net_profit IS 'Calculated: total_revenue - product_cost_total - fulfillment_cost - walmart_fee';
COMMENT ON COLUMN public.orders.roi IS 'Calculated: (net_profit / (fulfillment_cost + product_cost_total + walmart_fee)) * 100';

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_timestamp
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'Orders table has been updated to the new schema.';
END $$; 