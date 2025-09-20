# Database Migrations

This folder contains database migration scripts for the Walmart App.

## Structure

- `inventory-schema-update.sql` - SQL script to update the products table with extended inventory fields
- `supabase-migration.md` - Guide for applying the inventory schema migration

## How to Apply Migrations

1. Ensure you have access to your Supabase project
2. Follow the instructions in each migration guide
3. Apply migrations in the correct order (check file names for sequence)
4. Verify that each migration was successful before proceeding to the next

## Backup First

Always create a backup of your database before applying migrations, especially in production environments.

## Migration History

- **2023-07-01** - Initial schema creation (`supabase-schema.sql` in project root)
- **Current** - Enhanced inventory tables with additional fields and triggers 