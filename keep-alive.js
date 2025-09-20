// ====================================================================
// SUPABASE DATABASE KEEP-ALIVE SCRIPT
// ====================================================================
// Prevents Supabase from pausing your database due to inactivity
// Run this with Node.js or deploy to a service like Vercel/Netlify
// ====================================================================

import { createClient } from '@supabase/supabase-js';

// Your Supabase credentials (from .env.local)
const SUPABASE_URL = 'https://smzpbakngkdaogynpupm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtenBiYWtuZ2tkYW9neW5wdXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MTY3MjUsImV4cCI6MjA1ODA5MjcyNX0.26mGC7DdV62se6Lky9a7-L93TgX0YnPVNtM5nAn24Ww';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to ping the database
async function pingDatabase() {
  try {
    // Simple query to keep database active
    const { data, error } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Ping failed:', error);
    } else {
      console.log(`Database pinged successfully at ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error('Ping error:', err);
  }
}

// Ping immediately on start
pingDatabase();

// Ping every 6 days (to be safe, since Supabase pauses after 7 days)
const SIX_DAYS = 6 * 24 * 60 * 60 * 1000;
setInterval(pingDatabase, SIX_DAYS);

console.log('Keep-alive service started. Database will be pinged every 6 days.');