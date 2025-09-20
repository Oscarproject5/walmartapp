const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key must be provided in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestProducts() {
  console.log('Connecting to Supabase...');
  
  try {
    // Get count before deletion
    const { data: beforeCount, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: false })
      .eq('name', 'Permission Test Product');
    
    if (countError) {
      throw countError;
    }
    
    console.log(`Found ${beforeCount.length} products with name "Permission Test Product"`);
    
    if (beforeCount.length === 0) {
      console.log('No test products to delete. Exiting.');
      return;
    }
    
    // Delete test products
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('name', 'Permission Test Product');
      
    if (error) {
      throw error;
    }
    
    console.log(`Successfully deleted ${beforeCount.length} test products.`);
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the function
deleteTestProducts(); 