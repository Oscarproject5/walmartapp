# Orders Table Migration Guide

This guide explains how to apply the new Orders table schema to your Supabase database.

## Overview

The migration creates a new `orders` table that matches the specified schema requirements. This table will store all order information for inventory sold through Walmart, with proper relationships to the products table.

## Prerequisites

- Access to your Supabase project
- Database permissions to create tables and modify schema
- Backup of your existing data (recommended)

## Migration Steps

1. Log in to your Supabase dashboard and open your project
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `orders-table-migration.sql` file into the SQL editor
5. Review the SQL statements to ensure they match your database setup
6. Execute the SQL query

## What This Migration Does

The migration:

1. Creates the `orders` table with all required columns and data types:
   - Defines `order_id` as the primary key (UUID)
   - Sets up `product_sku` as a foreign key to the `products` table
   - Configures all columns with appropriate data types
   - Adds a check constraint to ensure `order_status` is valid

2. Automatically handles potential schema issues:
   - Checks if the `product_sku` column exists in the `products` table
   - Adds the column if it doesn't exist and populates it with sensible defaults
   - Safely adds foreign key constraints after validation

3. Adds helpful database features:
   - Creates indexes on frequently queried fields for better performance
   - Adds comprehensive column comments for documentation
   - Implements a trigger to automatically calculate derived fields

## Columns and Data Types

| Column Name              | Data Type             | Description                                               |
|--------------------------|-----------------------|-----------------------------------------------------------|
| order_id (PK)            | UUID                  | Unique ID for each order                                  |
| product_sku (FK)         | VARCHAR(255)          | SKU referencing Products table                            |
| product_name             | VARCHAR(255)          | Name of the product                                       |
| quantity                 | INTEGER               | Quantity ordered                                          |
| walmart_price_per_unit   | DECIMAL(10,2)         | Selling price per unit on Walmart                         |
| shipping_fee_per_unit    | DECIMAL(10,2)         | Shipping fee charged per unit sold                        |
| label_fee                | DECIMAL(10,2)         | Label fee per order                                       |
| total_revenue            | DECIMAL(12,2)         | (walmart_price_per_unit + shipping_fee_per_unit) × quantity |
| walmart_fee              | DECIMAL(12,2)         | total_revenue × 0.08 (8%)                                 |
| cost_per_unit            | DECIMAL(10,2)         | Purchase cost per unit from supplier                      |
| cost_of_product          | DECIMAL(12,2)         | cost_per_unit × quantity                                  |
| additional_costs         | DECIMAL(10,2)         | Extra costs per order                                     |
| net_profit               | DECIMAL(12,2)         | total_revenue – walmart_fee – cost_of_product – additional_costs |
| profit_margin            | DECIMAL(5,2)          | (net_profit ÷ (walmart_fee + cost_of_product + additional_costs)) × 100 |
| order_status             | VARCHAR(50)           | 'Completed', 'Canceled_Not_Shipped', or 'Canceled_After_Shipped' |
| order_date               | TIMESTAMPTZ           | Date and time when order was placed                       |
| delivery_date            | TIMESTAMPTZ (Nullable)| Date and time when order was delivered                    |
| supplier                 | VARCHAR(50)           | Supplier (Amazon, Walmart, Sam's Club)                    |
| supplier_order_date      | TIMESTAMPTZ           | When product was originally purchased from the supplier   |
| cancellation_loss        | DECIMAL(10,2)         | Cost lost if canceled after shipped                       |

## TypeScript Type Updates

After applying the SQL migration, update your TypeScript types:

1. The `app/lib/orders-types.ts` file contains the TypeScript type definitions for the Orders table
2. The `app/lib/supabase.ts` file has been updated to include the Orders table in the Database type

## Verifying the Migration

To verify the migration was successful:

1. Go to the Table Editor in your Supabase dashboard
2. Select the newly created `orders` table
3. Confirm that all columns are present with the correct data types
4. Try inserting a test record and verify that the calculated fields are updated automatically by the trigger

## Troubleshooting

If you encounter issues:

- Check the console output for error messages
- Verify that the `products` table has a `product_sku` column
- Ensure your database user has the necessary permissions
- If there are foreign key constraint failures, check that the referenced `product_sku` values exist in the `products` table

## Next Steps

After successfully applying the migration:

1. Update your application code to use the new `orders` table
2. If migrating from the `sales` table, create a data migration script
3. Test all functionality related to orders 