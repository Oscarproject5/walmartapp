// Updated TypeScript types for Supabase Database
// This is an enhancement to the existing types in app/lib/supabase.ts

export type InventoryItem = {
  id: string;
  sku: string | null;
  product_sku: string | null;
  name: string;
  product_name: string | null;
  quantity: number;
  cost_per_item: number;
  purchase_date: string;
  source: 'amazon' | 'walmart' | 'sams_club';
  created_at: string;
  image_url: string | null;
  supplier: string | null;
  product_link: string | null;
  purchase_price: number | null;
  sales_qty: number | null;
  available_qty: number | null;
  per_qty_price: number | null;
  stock_value: number | null;
  status: string | null;
  remarks: string | null;
};

// Example of type usage in components
/*
import { supabase } from '../lib/supabase';
import type { InventoryItem } from '../lib/supabase-types-update';

async function fetchInventory() {
  const { data, error } = await supabase
    .from('products')
    .select('*');
    
  if (error) throw error;
  
  return data as InventoryItem[];
}
*/

// Update instructions for Database type in supabase.ts
/*
In app/lib/supabase.ts, update the products table definition to:

products: {
  Row: {
    id: string;
    name: string;
    quantity: number;
    cost_per_item: number;
    purchase_date: string;
    source: 'amazon' | 'walmart' | 'sams_club';
    created_at: string;
    sku: string | null;
    product_sku: string | null;
    product_name: string | null;
    image_url: string | null;
    supplier: string | null;
    product_link: string | null;
    purchase_price: number | null;
    sales_qty: number | null;
    available_qty: number | null;
    per_qty_price: number | null;
    stock_value: number | null;
    status: string | null;
    remarks: string | null;
  };
  Insert: {
    id?: string;
    name: string;
    quantity: number;
    cost_per_item: number;
    purchase_date: string;
    source: 'amazon' | 'walmart' | 'sams_club';
    created_at?: string;
    sku?: string | null;
    product_sku?: string | null;
    product_name?: string | null;
    image_url?: string | null;
    supplier?: string | null;
    product_link?: string | null;
    purchase_price?: number | null;
    sales_qty?: number | null;
    available_qty?: number | null;
    per_qty_price?: number | null;
    stock_value?: number | null;
    status?: string | null;
    remarks?: string | null;
  };
  Update: {
    id?: string;
    name?: string;
    quantity?: number;
    cost_per_item?: number;
    purchase_date?: string;
    source?: 'amazon' | 'walmart' | 'sams_club';
    created_at?: string;
    sku?: string | null;
    product_sku?: string | null;
    product_name?: string | null;
    image_url?: string | null;
    supplier?: string | null;
    product_link?: string | null;
    purchase_price?: number | null;
    sales_qty?: number | null;
    available_qty?: number | null;
    per_qty_price?: number | null;
    stock_value?: number | null;
    status?: string | null;
    remarks?: string | null;
  };
};
*/ 