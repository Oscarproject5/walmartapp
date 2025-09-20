# Supabase Database Setup

This guide explains how to set up the required database tables for the Walmart App in Supabase.

## Prerequisites

- A Supabase account and project
- Access to the SQL Editor in the Supabase dashboard

## Setup Instructions

1. Log in to your Supabase account and open your project
2. Navigate to the SQL Editor in the left sidebar
3. Click "New query"
4. Copy and paste the entire contents of the `supabase-schema.sql` file into the SQL editor
5. Click "Run" to execute the SQL commands

This will:
- Create the required tables: `products`, `sales`, `shipping_settings`, `canceled_orders`, `app_settings`, and `ai_recommendations`
- Insert sample data into these tables

## Tables Created

1. **products** - Stores information about products including name, quantity, cost, and purchase source
2. **sales** - Records sales transactions including details about quantity sold, pricing, shipping, and profit margins
3. **shipping_settings** - Contains shipping cost configurations
4. **canceled_orders** - Tracks canceled orders with cost losses and notes
5. **app_settings** - Stores application configuration settings including auto-reorder settings
6. **ai_recommendations** - Stores AI-generated recommendations for inventory management

## Table Schema

The schema has been designed to match exactly what your application expects based on the TypeScript type definitions in `app/lib/supabase.ts`. The schema includes:

- Proper column names and data types matching your application code
- Default values for non-nullable fields
- Appropriate relationships between tables using foreign keys
- Sample data that demonstrates realistic usage scenarios

## Troubleshooting

If you encounter any errors:

- Check if tables already exist by running: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
- If tables exist but need to be recreated, you can drop them first: `DROP TABLE IF EXISTS public.ai_recommendations, public.canceled_orders, public.sales, public.products, public.shipping_settings, public.app_settings CASCADE;`
- If you see "relation does not exist" errors in your application, make sure that all tables have been created successfully by checking in the Supabase Table Editor

## Environment Variables

Your `.env.local` file already contains Supabase connection information:

```
NEXT_PUBLIC_SUPABASE_URL=https://smzpbakngkdaogynpupm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtenBiYWtuZ2tkYW9neW5wdXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MTY3MjUsImV4cCI6MjA1ODA5MjcyNX0.26mGC7DdV62se6Lky9a7-L93TgX0YnPVNtM5nAn24Ww
```

After running the database setup script, restart your Next.js application with `npm run dev` to ensure it connects to the newly created tables. 