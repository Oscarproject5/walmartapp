import { supabase } from './supabase';

/**
 * Utility to check if the current user has necessary permissions for database operations
 * without inserting actual test records
 */
export async function checkDatabasePermissions() {
  try {
    console.log('Checking database permissions...');
    
    // Check read permissions
    const readCheck = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });
    
    // Check if user is authenticated - this is a prerequisite for write permissions
    const { data: sessionData } = await supabase.auth.getSession();
    const isAuthenticated = sessionData.session !== null;
    
    // We'll assume insert permission if user can read and is authenticated
    // Instead of actually inserting a test record
    const canInsert = !readCheck.error && isAuthenticated;
    
    // Check delete permissions on a non-existent ID (safe test)
    const deleteCheck = await supabase
      .from('products')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
      .select();
    
    // Report results
    return {
      canRead: !readCheck.error,
      canInsert: canInsert,
      canDelete: !deleteCheck.error || deleteCheck.error.message.includes('No rows'),
      readError: readCheck.error?.message,
      insertError: null, // No insert was attempted
      deleteError: deleteCheck.error?.message,
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      canRead: false,
      canInsert: false,
      canDelete: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 