import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

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
    console.log(`Found ${products.length} products:`);
    if (products.length > 0) {
      console.log(products[0]); // Log the first product
    }
  }
  
  // Check sales table
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*');
  
  if (salesError) {
    console.error('Error fetching sales:', salesError.message);
  } else {
    console.log(`Found ${sales.length} sales:`);
    if (sales.length > 0) {
      console.log(sales[0]); // Log the first sale
    }
  }
  
  // Check shipping_settings table
  const { data: shippingSettings, error: shippingError } = await supabase
    .from('shipping_settings')
    .select('*');
  
  if (shippingError) {
    console.error('Error fetching shipping settings:', shippingError.message);
  } else {
    console.log(`Found ${shippingSettings.length} shipping settings:`);
    if (shippingSettings.length > 0) {
      console.log(shippingSettings[0]);
    }
  }
  
  // Check app_settings table
  const { data: appSettings, error: appSettingsError } = await supabase
    .from('app_settings')
    .select('*');
  
  if (appSettingsError) {
    console.error('Error fetching app settings:', appSettingsError.message);
  } else {
    console.log(`Found ${appSettings.length} app settings:`);
    if (appSettings.length > 0) {
      console.log(appSettings[0]);
    }
  }
  
  // Check orders table
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*');
  
  if (ordersError) {
    console.error('Error fetching orders:', ordersError.message);
  } else {
    console.log(`Found ${orders.length} orders:`);
    if (orders.length > 0) {
      console.log(orders[0]);
    }
  }
  
  // Check for permission issues by trying a more complex query
  const { data: joinedData, error: joinError } = await supabase
    .from('orders')
    .select(`
      order_id,
      sku,
      products (
        name,
        product_sku
      )
    `)
    .limit(1);
  
  if (joinError) {
    console.error('Error with join query:', joinError.message);
  } else {
    console.log('Join query result:', joinedData);
  }
}

debugDatabase().catch(console.error); 