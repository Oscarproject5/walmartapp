import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Check if environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create the Supabase client with options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Test connection in development
if (process.env.NODE_ENV === 'development') {
  (async () => {
    try {
      const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('Supabase connection test failed:', error.message);
      } else {
        console.log('Supabase connection successful');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Supabase connection error:', errorMessage);
    }
  })();
}

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string;
          shipping_base_cost: number;
          label_cost: number;
          cancellation_shipping_loss: number;
          minimum_profit_margin: number;
          auto_reorder_enabled: boolean;
          auto_price_adjustment_enabled: boolean;
          openrouter_api_key: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          shipping_base_cost?: number;
          label_cost?: number;
          cancellation_shipping_loss?: number;
          minimum_profit_margin?: number;
          auto_reorder_enabled?: boolean;
          auto_price_adjustment_enabled?: boolean;
          openrouter_api_key?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          shipping_base_cost?: number;
          label_cost?: number;
          cancellation_shipping_loss?: number;
          minimum_profit_margin?: number;
          auto_reorder_enabled?: boolean;
          auto_price_adjustment_enabled?: boolean;
          openrouter_api_key?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      shipping_settings: {
        Row: {
          id: string;
          base_cost: number;
          label_cost: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          base_cost?: number;
          label_cost?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          base_cost?: number;
          label_cost?: number;
          updated_at?: string;
          user_id?: string;
        };
      };
      ai_recommendations: {
        Row: {
          id: string;
          type: 'price_adjustment' | 'reorder' | 'remove' | 'forecast';
          product_id: string | null;
          recommendation: string;
          explanation: string;
          suggested_action: string;
          impact_analysis: {
            current_profit: number;
            projected_profit: number;
            confidence_score: number;
          };
          status: 'pending' | 'approved' | 'rejected' | 'implemented';
          created_at: string;
          implemented_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          type: 'price_adjustment' | 'reorder' | 'remove' | 'forecast';
          product_id?: string | null;
          recommendation: string;
          explanation: string;
          suggested_action: string;
          impact_analysis: {
            current_profit: number;
            projected_profit: number;
            confidence_score: number;
          };
          status?: 'pending' | 'approved' | 'rejected' | 'implemented';
          created_at?: string;
          implemented_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          type?: 'price_adjustment' | 'reorder' | 'remove' | 'forecast';
          product_id?: string | null;
          recommendation?: string;
          explanation?: string;
          suggested_action?: string;
          impact_analysis?: {
            current_profit: number;
            projected_profit: number;
            confidence_score: number;
          };
          status?: 'pending' | 'approved' | 'rejected' | 'implemented';
          created_at?: string;
          implemented_at?: string | null;
          user_id?: string;
        };
      };
      canceled_orders: {
        Row: {
          id: string;
          sale_id: string;
          cancellation_date: string;
          cancellation_type: 'before_shipping' | 'after_shipping';
          shipping_cost_loss: number;
          product_cost_loss: number;
          total_loss: number;
          notes: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          cancellation_date: string;
          cancellation_type: 'before_shipping' | 'after_shipping';
          shipping_cost_loss?: number;
          product_cost_loss?: number;
          total_loss?: number;
          notes?: string | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          cancellation_date?: string;
          cancellation_type?: 'before_shipping' | 'after_shipping';
          shipping_cost_loss?: number;
          product_cost_loss?: number;
          total_loss?: number;
          notes?: string | null;
          created_at?: string;
          user_id?: string;
        };
      };
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
          product_sku: string;
          product_name: string | null;
          image_url: string | null;
          supplier: string | null;
          product_link: string | null;
          purchase_price: number | null;
          sales_qty: number;
          available_qty: number;
          per_qty_price: number | null;
          stock_value: number | null;
          status: string;
          remarks: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          quantity: number;
          cost_per_item: number;
          purchase_date?: string;
          source?: 'amazon' | 'walmart' | 'sams_club';
          created_at?: string;
          sku?: string | null;
          product_sku: string;
          product_name?: string | null;
          image_url?: string | null;
          supplier?: string | null;
          product_link?: string | null;
          purchase_price?: number | null;
          sales_qty?: number;
          available_qty?: number;
          per_qty_price?: number | null;
          stock_value?: number | null;
          status?: string;
          remarks?: string | null;
          user_id: string;
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
          product_sku?: string;
          product_name?: string | null;
          image_url?: string | null;
          supplier?: string | null;
          product_link?: string | null;
          purchase_price?: number | null;
          sales_qty?: number;
          available_qty?: number;
          per_qty_price?: number | null;
          stock_value?: number | null;
          status?: string;
          remarks?: string | null;
          user_id?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          product_id: string;
          quantity_sold: number;
          sale_price: number;
          shipping_fee_per_unit: number;
          walmart_fee: number;
          sale_date: string;
          platform: 'walmart';
          shipping_cost: number;
          label_cost: number;
          cost_per_unit: number;
          additional_costs: number;
          total_revenue: number;
          net_profit: number;
          profit_margin: number;
          status: 'active' | 'canceled_before_shipping' | 'canceled_after_shipping';
          created_at: string;
          purchase_order_number: string | null;
          ship_by_date: string | null;
          order_number: string | null;
          fulfilled_by: string | null;
          ship_node: string | null;
          ship_node_id: string | null;
          ship_method: string | null;
          carrier_method: string | null;
          item_condition: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity_sold: number;
          sale_price: number;
          shipping_fee_per_unit: number;
          walmart_fee?: number;
          sale_date: string;
          platform: 'walmart';
          shipping_cost?: number;
          label_cost?: number;
          cost_per_unit?: number;
          additional_costs?: number;
          total_revenue?: number;
          net_profit?: number;
          profit_margin?: number;
          status?: 'active' | 'canceled_before_shipping' | 'canceled_after_shipping';
          created_at?: string;
          purchase_order_number?: string | null;
          ship_by_date?: string | null;
          order_number?: string | null;
          fulfilled_by?: string | null;
          ship_node?: string | null;
          ship_node_id?: string | null;
          ship_method?: string | null;
          carrier_method?: string | null;
          item_condition?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity_sold?: number;
          sale_price?: number;
          shipping_fee_per_unit?: number;
          walmart_fee?: number;
          sale_date?: string;
          platform?: 'walmart';
          shipping_cost?: number;
          label_cost?: number;
          cost_per_unit?: number;
          additional_costs?: number;
          total_revenue?: number;
          net_profit?: number;
          profit_margin?: number;
          status?: 'active' | 'canceled_before_shipping' | 'canceled_after_shipping';
          created_at?: string;
          purchase_order_number?: string | null;
          ship_by_date?: string | null;
          order_number?: string | null;
          fulfilled_by?: string | null;
          ship_node?: string | null;
          ship_node_id?: string | null;
          ship_method?: string | null;
          carrier_method?: string | null;
          item_condition?: string | null;
          user_id?: string;
        };
      };
      orders: {
        Row: {
          order_id: string;
          order_date: string;
          customer_name: string;
          sku: string;
          product_name: string | null;
          order_quantity: number;
          walmart_price_per_unit: number;
          walmart_shipping_fee_per_unit: number;
          product_cost_per_unit: number;
          fulfillment_cost: number;
          shipping_settings_id: string | null;
          walmart_shipping_total: number;
          walmart_item_total: number;
          total_revenue: number;
          walmart_fee: number;
          product_cost_total: number;
          net_profit: number;
          roi: number;
          created_at: string;
          updated_at: string;
          status: string;
          user_id: string;
          upload_batch_id: string | null;
          app_settings_id: string | null;
        };
        Insert: {
          order_id?: string;
          order_date: string;
          customer_name: string;
          sku: string;
          product_name?: string | null;
          order_quantity: number;
          walmart_price_per_unit: number;
          walmart_shipping_fee_per_unit: number;
          product_cost_per_unit: number;
          fulfillment_cost: number;
          shipping_settings_id?: string | null;
          walmart_shipping_total?: number;
          walmart_item_total?: number;
          total_revenue?: number;
          walmart_fee?: number;
          product_cost_total?: number;
          net_profit?: number;
          roi?: number;
          created_at?: string;
          updated_at?: string;
          status?: string;
          user_id: string;
          upload_batch_id?: string | null;
          app_settings_id?: string | null;
        };
        Update: {
          order_id?: string;
          order_date?: string;
          customer_name?: string;
          sku?: string;
          product_name?: string | null;
          order_quantity?: number;
          walmart_price_per_unit?: number;
          walmart_shipping_fee_per_unit?: number;
          product_cost_per_unit?: number;
          fulfillment_cost?: number;
          shipping_settings_id?: string | null;
          walmart_shipping_total?: number;
          walmart_item_total?: number;
          total_revenue?: number;
          walmart_fee?: number;
          product_cost_total?: number;
          net_profit?: number;
          roi?: number;
          created_at?: string;
          updated_at?: string;
          status?: string;
          user_id?: string;
          upload_batch_id?: string | null;
          app_settings_id?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          profile_image_url: string | null;
          walmart_seller_id: string | null;
          amazon_seller_id: string | null;
          tax_id: string | null;
          business_type: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          profile_image_url?: string | null;
          walmart_seller_id?: string | null;
          amazon_seller_id?: string | null;
          tax_id?: string | null;
          business_type?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
          profile_image_url?: string | null;
          walmart_seller_id?: string | null;
          amazon_seller_id?: string | null;
          tax_id?: string | null;
          business_type?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      inventory_view: {
        Row: {
          id: string;
          sku: string | null;
          product_sku: string;
          product_name: string | null;
          image_url: string | null;
          supplier: string | null;
          product_link: string | null;
          purchase_price: number | null;
          total_qty: number;
          sales_qty: number;
          available_qty: number;
          per_qty_price: number | null;
          stock_value: number | null;
          status: string;
          remarks: string | null;
          created_at: string;
          user_id: string;
        };
      };
      batch_analytics_view: {
        Row: {
          upload_batch_id: string;
          order_count: number;
          created_at: string;
          user_id: string;
          total_revenue: number;
          total_profit: number;
        };
      };
    };
  };
};

// Let's add a function to check the database schema
export async function checkDatabaseSchema() {
  try {
    // Create an authenticated client
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    
    // Try to get the current session
    const { data: { session } } = await authClient.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return { 
        success: false, 
        error: 'No authenticated user found'
      };
    }
    
    // Check if the products table has a status field
    const { data, error } = await authClient
      .from('products')
      .select('status')
      .eq('user_id', userId)
      .limit(1);
    
    if (error) {
      console.error('Error checking schema:', error);
      return { success: false, error };
    }
    
    // Check the metadata/columns for the products table
    const { data: tableInfo, error: tableError } = await authClient.rpc('get_table_info', {
      table_name: 'products'
    });
    
    if (tableError) {
      console.error('Error getting table info:', tableError);
      return { success: false, error: tableError };
    }
    
    return { 
      success: true, 
      hasStatusField: data && data.length > 0 && 'status' in data[0],
      tableInfo
    };
  } catch (err) {
    console.error('Schema check failed:', err);
    return { success: false, error: err };
  }
}

// Helper to get current user ID safely
export async function getCurrentUserId() {
  try {
    const client = createClientComponentClient();
    const { data: { session } } = await client.auth.getSession();
    return session?.user?.id;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
} 