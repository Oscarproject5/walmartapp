import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`Environment file not found: ${envPath}`);
}

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('Checking database tables...');
  
  // Check products table
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*');
  
  if (productsError) {
    console.error('Error fetching products:', productsError.message);
  } else {
    console.log(`Found ${products?.length || 0} products:`);
    if (products && products.length > 0) {
      console.log(JSON.stringify(products[0], null, 2)); // Log the first product
    }
  }
  
  // Check sales table
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*');
  
  if (salesError) {
    console.error('Error fetching sales:', salesError.message);
  } else {
    console.log(`Found ${sales?.length || 0} sales:`);
    if (sales && sales.length > 0) {
      console.log(JSON.stringify(sales[0], null, 2)); // Log the first sale
    }
  }
  
  // Check shipping_settings table
  const { data: shippingSettings, error: shippingError } = await supabase
    .from('shipping_settings')
    .select('*');
  
  if (shippingError) {
    console.error('Error fetching shipping settings:', shippingError.message);
  } else {
    console.log(`Found ${shippingSettings?.length || 0} shipping settings:`);
    if (shippingSettings && shippingSettings.length > 0) {
      console.log(JSON.stringify(shippingSettings[0], null, 2));
    }
  }
  
  // Check app_settings table
  const { data: appSettings, error: appSettingsError } = await supabase
    .from('app_settings')
    .select('*');
  
  if (appSettingsError) {
    console.error('Error fetching app settings:', appSettingsError.message);
  } else {
    console.log(`Found ${appSettings?.length || 0} app settings:`);
    if (appSettings && appSettings.length > 0) {
      console.log(JSON.stringify(appSettings[0], null, 2));
    }
  }
  
  // Check orders table
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*');
  
  if (ordersError) {
    console.error('Error fetching orders:', ordersError.message);
  } else {
    console.log(`Found ${orders?.length || 0} orders:`);
    if (orders && orders.length > 0) {
      console.log(JSON.stringify(orders[0], null, 2));
    }
  }
  
  // Check for permission issues by trying a more complex query
  try {
    const { data: joinedData, error: joinError } = await supabase
      .from('orders')
      .select(`
        order_id,
        sku,
        products!inner (
          name,
          product_sku
        )
      `)
      .limit(1);
    
    if (joinError) {
      console.error('Error with join query:', joinError.message);
    } else {
      console.log('Join query result:', JSON.stringify(joinedData, null, 2));
    }
  } catch (err) {
    console.error('Exception in join query:', err.message);
  }
}

debugDatabase().catch(console.error); 