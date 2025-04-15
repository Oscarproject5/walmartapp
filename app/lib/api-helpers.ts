import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Gets the current user ID from the authenticated session
 * @returns User ID and Supabase client, or null if not authenticated
 */
export async function getUserIdAndClient() {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  // Get the user session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return { userId: null, supabase }
  }
  
  return { userId: session.user.id, supabase }
}

/**
 * Middleware to ensure API requests are authenticated and include user ID
 * @param handler The API route handler function 
 */
export function withUserAuth(
  handler: (req: NextRequest, params: { userId: string }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const { userId, supabase } = await getUserIdAndClient()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return handler(req, { userId })
  }
}

/**
 * Helper function to create a database query with user isolation
 * @param supabase Supabase client
 * @param table Table name
 * @param userId User ID to filter by
 */
export function createUserIsolatedQuery(supabase: any, table: string, userId: string) {
  return supabase.from(table).select('*').eq('user_id', userId)
}

/**
 * Helper function to create a database insertion with user ID
 * @param supabase Supabase client
 * @param table Table name
 * @param data Data to insert
 * @param userId User ID to include
 */
export function createUserIsolatedInsert(supabase: any, table: string, data: any, userId: string) {
  return supabase.from(table).insert({
    ...data,
    user_id: userId
  })
}

/**
 * Helper function to update a record with user isolation
 * @param supabase Supabase client
 * @param table Table name
 * @param id Record ID
 * @param data Data to update
 * @param userId User ID to filter by
 */
export function createUserIsolatedUpdate(
  supabase: any, 
  table: string, 
  id: string, 
  data: any, 
  userId: string
) {
  return supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
}

/**
 * Helper function to delete a record with user isolation
 * @param supabase Supabase client
 * @param table Table name
 * @param id Record ID
 * @param userId User ID to filter by
 */
export function createUserIsolatedDelete(
  supabase: any, 
  table: string, 
  id: string, 
  userId: string
) {
  return supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
} 