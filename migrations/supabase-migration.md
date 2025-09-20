# Inventory Schema Migration Guide

This guide explains how to apply the inventory table schema updates to your Supabase database.

## Prerequisites

- Access to your Supabase project
- Database permissions to alter tables and create triggers
- Backup of your existing data (recommended)

## Migration Steps

1. Log in to your Supabase dashboard and open your project
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `inventory-schema-update.sql` file into the SQL editor
5. Review the SQL statements to ensure they match your database setup
6. Execute the SQL query

## What This Migration Does

The migration makes the following changes:

1. Adds new columns to the `products` table to support the enhanced inventory view:
   - `sku` - Unique product identifier (VARCHAR)
   - `product_sku` - Secondary product identifier (VARCHAR)
   - `product_name` - Alternate product name field (VARCHAR)
   - `image_url` - URL to product image (TEXT)
   - `supplier` - Product supplier name (VARCHAR)
   - `product_link` - URL to product page (TEXT)
   - `purchase_price` - Price paid for the product (DECIMAL)
   - `sales_qty` - Quantity sold (INTEGER)
   - `available_qty` - Available quantity (INTEGER)
   - `per_qty_price` - Price per unit (DECIMAL)
   - `stock_value` - Total inventory value (DECIMAL)
   - `status` - Product status (VARCHAR)
   - `remarks` - Notes about the product (TEXT)

2. Creates database triggers:
   - `update_stock_value_trigger` - Automatically calculates stock value when quantity or cost changes
   - `update_product_sales_qty_insert_trigger` and `update_product_sales_qty_delete_trigger` - Keep track of sales quantities

3. Creates a view for displaying the inventory:
   - `inventory_view` - Combines all product fields for easy querying

4. Adds sample inventory data with SKUs and enhanced fields

## TypeScript Type Updates

After applying the SQL migration, update your TypeScript types by:

1. Adding the new `InventoryItem` type from the `app/lib/supabase-types-update.ts` file to your project
2. Updating the `products` table definition in your `supabase.ts` file as described in the comments

## Verifying the Migration

To verify the migration was successful:

1. Go to the Table Editor in your Supabase dashboard
2. Select the `products` table
3. Confirm that the new columns are present
4. Check that the sample data has been added
5. Verify that the triggers work by:
   - Adding a new product and confirming that `stock_value` is calculated correctly
   - Creating a sale and confirming that `sales_qty` and `available_qty` are updated

## Rolling Back

If you need to roll back the migration, you can run:

```sql
ALTER TABLE public.products
DROP COLUMN IF EXISTS sku,
DROP COLUMN IF EXISTS product_sku,
DROP COLUMN IF EXISTS product_name,
DROP COLUMN IF EXISTS image_url,
DROP COLUMN IF EXISTS supplier,
DROP COLUMN IF EXISTS product_link,
DROP COLUMN IF EXISTS purchase_price,
DROP COLUMN IF EXISTS sales_qty,
DROP COLUMN IF EXISTS available_qty,
DROP COLUMN IF EXISTS per_qty_price,
DROP COLUMN IF EXISTS stock_value,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS remarks;

DROP TRIGGER IF EXISTS update_stock_value_trigger ON public.products;
DROP FUNCTION IF EXISTS update_stock_value();

DROP TRIGGER IF EXISTS update_product_sales_qty_insert_trigger ON public.sales;
DROP TRIGGER IF EXISTS update_product_sales_qty_delete_trigger ON public.sales;
DROP FUNCTION IF EXISTS update_product_sales_qty();

DROP VIEW IF EXISTS public.inventory_view;
``` 