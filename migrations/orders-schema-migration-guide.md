# Orders Table Schema Migration Guide

This document explains the migration from the old Orders table schema to the new streamlined schema that clearly separates user-uploaded data from calculated fields.

## Overview of Changes

The new Orders table schema is designed to:

1. Clearly divide fields into categories:
   - Fields directly uploaded by users (via Excel)
   - Fields linked to inventory or settings (for calculations)
   - Fields automatically calculated by the system

2. Improve profit calculations and financial reporting
3. Make searching and filtering more efficient
4. Separate customer-facing fields from internal operational data

## Migration Process

To migrate to the new schema, follow these steps:

1. **Backup Your Data**: Before proceeding, create a backup of your existing orders data.

2. **Run the Migration Script**: Execute the `orders-table-update.sql` script in your database. This script will:
   - Drop the existing orders table (after checking it exists)
   - Create a new orders table with the updated schema
   - Set up proper indexes, constraints, and computed columns
   - Add appropriate comments to document each field

3. **Load Sample Data**: To test the new schema, you can run the `orders-sample-data-updated.sql` script to populate the table with sample data.

4. **Update Your Application Code**: Ensure all components using the old schema are updated to work with the new schema. The main changes are:
   - Field name changes (e.g., `quantity` → `order_quantity`, `product_sku` → `sku`)
   - New calculated fields (`walmart_shipping_total`, `walmart_item_total`, `roi`)
   - Removed fields (e.g., `supplier`, `delivery_date`, `order_status`)

## Field Mapping Details

### Fields Moved/Renamed:
- `product_sku` → `sku`
- `quantity` → `order_quantity`
- `shipping_fee_per_unit` → `walmart_shipping_fee_per_unit`
- `cost_per_unit` → `product_cost_per_unit`

### New Fields Added:
- `customer_name` - Customer's name for reporting/search
- `fulfillment_cost` - Cost of fulfillment (from settings or per-product)
- `walmart_shipping_total` - Total shipping (calculated field)
- `walmart_item_total` - Total item price (calculated field)
- `product_cost_total` - Total product cost (calculated field)
- `roi` - Return on Investment percentage (calculated field)
- `created_at` - Record creation timestamp
- `updated_at` - Record last update timestamp

### Fields Removed:
- `label_fee` - Now incorporated into `fulfillment_cost`
- `delivery_date` - Removed for simplification
- `supplier` - Moved to product information
- `supplier_order_date` - Moved to product information
- `cancellation_loss` - Removed from base schema
- `order_status` - Removed from base schema
- `profit_margin` - Replaced with more accurate `roi` calculation

## Calculation Formulas

The new schema includes several automatically calculated fields:

- `walmart_shipping_total` = `walmart_shipping_fee_per_unit` × `order_quantity`
- `walmart_item_total` = `walmart_price_per_unit` × `order_quantity`
- `total_revenue` = `walmart_item_total` + `walmart_shipping_total`
- `walmart_fee` = `total_revenue` × 0.08 (8% fee)
- `product_cost_total` = `product_cost_per_unit` × `order_quantity`
- `net_profit` = `total_revenue` - `product_cost_total` - `fulfillment_cost` - `walmart_fee`
- `roi` = (`net_profit` / (`fulfillment_cost` + `product_cost_total` + `walmart_fee`)) × 100

## UI Updates

The Orders UI has been updated to reflect these changes:
- New layout focusing on customer and financial information
- Expanded details showing all cost breakdowns when needed
- Improved metrics showing ROI instead of profit margin
- Enhanced filters for improved data exploration

## Troubleshooting

If you encounter issues during migration:

1. **Foreign Key Constraints**: Ensure all products have valid SKUs before migration
2. **Calculation Errors**: Verify all required fields have proper values
3. **API Compatibility**: Update any external integrations to use the new field names

For assistance, contact the system administrator or refer to the technical documentation. 