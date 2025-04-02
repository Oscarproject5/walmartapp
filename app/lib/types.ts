// Export all types from the database
import { Database } from './supabase';
export type { Database } from './supabase';

// Export the enhanced inventory types
export type { InventoryItem } from './supabase-types-update';

// Define commonly used types from the database
export type Product = Database['public']['Tables']['products']['Row'];
export type Sale = Database['public']['Tables']['sales']['Row'];
export type CanceledOrder = Database['public']['Tables']['canceled_orders']['Row'];
export type AppSettings = Database['public']['Tables']['app_settings']['Row'];
export type AiRecommendation = Database['public']['Tables']['ai_recommendations']['Row'];

// Helper types
export type SortOrder = 'asc' | 'desc';
export type StatusType = 'active' | 'low_stock' | 'out_of_stock';

export type User = {
  id: string;
  auth_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  profile_image_url?: string;
  walmart_seller_id?: string;
  amazon_seller_id?: string;
  tax_id?: string;
  business_type?: string;
  created_at?: string;
  updated_at?: string;
}; 