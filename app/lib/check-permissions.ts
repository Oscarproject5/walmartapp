import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Utility to check if the current user has necessary permissions for database operations
 * without inserting actual test records
 */
export async function checkDatabasePermissions() {
  try {
    console.log('Checking database permissions...');
    
    // Create authenticated client
    const supabase = createClientComponentClient();
    
    // Get the current user's ID for proper isolation
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const isAuthenticated = !!userId;
    
    if (!isAuthenticated) {
      return {
        canRead: false,
        canInsert: false,
        canDelete: false,
        error: 'User is not authenticated'
      };
    }
    
    // Check read permissions
    const readCheck = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    // We'll assume insert permission if user can read and is authenticated
    const canInsert = !readCheck.error && isAuthenticated;
    
    // Check delete permissions on a non-existent ID (safe test)
    const deleteCheck = await supabase
      .from('products')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
      .eq('user_id', userId) // Add user isolation
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