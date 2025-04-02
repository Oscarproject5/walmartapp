/**
 * TypeScript type definitions for the Orders table
 */

export type OrderStatus = 'Completed' | 'Canceled' | 'Processing' | 'Shipped';

/**
 * Represents a single order in the system
 */
export interface Order {
  // Primary key
  order_id: string;
  
  // Fields uploaded via Excel (manually imported by user)
  order_date: string;
  customer_name: string;
  sku: string;
  product_name: string;
  order_quantity: number;
  walmart_price_per_unit: number;
  walmart_shipping_fee_per_unit: number;
  
  // Fields linked to inventory or settings
  product_cost_per_unit: number;
  fulfillment_cost: number;
  
  // Fields calculated automatically
  walmart_shipping_total: number;
  walmart_item_total: number;
  total_revenue: number;
  walmart_fee: number;
  product_cost_total: number;
  net_profit: number;
  roi: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Type definitions for inserting an order
 * Only includes fields that can be manually entered
 */
export interface OrderInsert {
  order_id?: string; // Optional to allow auto-generation
  
  // Manual entry fields
  order_date: string;
  customer_name: string;
  sku: string;
  product_name?: string;
  order_quantity: number;
  walmart_price_per_unit: number;
  walmart_shipping_fee_per_unit: number;
  
  // These must be provided even though they might be looked up
  product_cost_per_unit: number;
  fulfillment_cost: number;
}

/**
 * Type definitions for updating an order
 * Only includes fields that can be manually updated
 */
export interface OrderUpdate {
  // Fields that can be updated
  order_date?: string;
  customer_name?: string;
  sku?: string;
  product_name?: string;
  order_quantity?: number;
  walmart_price_per_unit?: number;
  walmart_shipping_fee_per_unit?: number;
  product_cost_per_unit?: number;
  fulfillment_cost?: number;
} 