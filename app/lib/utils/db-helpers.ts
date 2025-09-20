import { supabase, getCurrentUserId } from '../supabase';

/**
 * Adds the current user's ID to the data object before insertion
 * @param table The table name to insert into
 * @param data The data to insert
 * @returns The result of the insert operation
 */
export async function insertWithUserId(table: string, data: any) {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  // Add user_id to the data
  const dataWithUserId = Array.isArray(data) 
    ? data.map(item => ({ ...item, user_id: userId }))
    : { ...data, user_id: userId };
  
  return supabase.from(table).insert(dataWithUserId);
}

/**
 * Updates data in a table with the current user's ID as a filter
 * @param table The table name to update
 * @param data The data to update
 * @param id The ID of the record to update
 * @returns The result of the update operation
 */
export async function updateWithUserId(table: string, data: any, id: string) {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  return supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .eq('user_id', userId);
}

/**
 * Deletes data from a table with the current user's ID as a filter
 * @param table The table name to delete from
 * @param id The ID of the record to delete
 * @returns The result of the delete operation
 */
export async function deleteWithUserId(table: string, id: string) {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  return supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
}

/**
 * Selects data from a table with the current user's ID as a filter
 * @param table The table name to select from
 * @param columns The columns to select
 * @returns A query builder to continue the query
 */
export async function selectWithUserId(table: string, columns?: string) {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  const query = supabase
    .from(table)
    .select(columns || '*')
    .eq('user_id', userId);
    
  return query;
}

/**
 * Gets a single record by ID, ensuring it belongs to the current user
 * @param table The table name to select from
 * @param id The ID of the record to get
 * @param columns The columns to select
 * @returns The record if found
 */
export async function getByIdWithUserId(table: string, id: string, columns?: string) {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  return supabase
    .from(table)
    .select(columns || '*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
}

/**
 * Creates default app settings for a new user
 * @returns The result of the insert operation
 */
export async function createDefaultSettingsForUser() {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  // Check if user already has settings
  const { data: existingSettings } = await supabase
    .from('app_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (existingSettings) {
    // User already has settings
    return { data: existingSettings, error: null };
  }
  
  // Create default settings
  const defaultSettings = {
    shipping_base_cost: 5.00,
    label_cost: 1.00,
    cancellation_shipping_loss: 5.00,
    minimum_profit_margin: 10.00,
    auto_reorder_enabled: false,
    auto_price_adjustment_enabled: false,
    user_id: userId
  };
  
  return supabase
    .from('app_settings')
    .insert(defaultSettings)
    .select()
    .single();
} 