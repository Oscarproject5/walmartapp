// ====================================================================
// NEXT.JS API ROUTE - DATABASE KEEP-ALIVE
// ====================================================================
// This API endpoint can be called by external cron services
// to keep your Supabase database active
// ====================================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    // Simple query to keep database active
    const { data, error } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Keep-alive ping failed:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString();
    console.log(`Database pinged successfully at ${timestamp}`);

    return NextResponse.json({
      success: true,
      message: 'Database is active',
      timestamp
    });
  } catch (err) {
    console.error('Keep-alive error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Also support POST requests for flexibility
  return GET(request);
}