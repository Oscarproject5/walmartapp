-- Direct SQL command to update orders with correct inventory costs
-- Run this in Supabase SQL Editor

-- Update orders using per_qty_price from inventory (preferred)
UPDATE public.orders o
SET product_cost_per_unit = p.per_qty_price
FROM public.products p
WHERE LOWER(o.sku) = LOWER(p.product_sku)
AND p.per_qty_price IS NOT NULL
AND ABS(o.product_cost_per_unit - p.per_qty_price) > 0.001;

-- For any remaining orders where per_qty_price wasn't available, use cost_per_item
UPDATE public.orders o
SET product_cost_per_unit = p.cost_per_item
FROM public.products p
WHERE LOWER(o.sku) = LOWER(p.product_sku)
AND p.per_qty_price IS NULL
AND p.cost_per_item IS NOT NULL
AND ABS(o.product_cost_per_unit - p.cost_per_item) > 0.001;