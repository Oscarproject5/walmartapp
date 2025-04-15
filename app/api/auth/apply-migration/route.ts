import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

// This endpoint requires admin privileges to run database migrations
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ 
        error: 'Only administrators can apply migrations' 
      }, { status: 403 })
    }
    
    // Get the migration file path from request body
    const { migrationFile } = await req.json()
    
    if (!migrationFile) {
      return NextResponse.json({ 
        error: 'Migration file path is required' 
      }, { status: 400 })
    }
    
    // Read the migration file
    const filePath = path.join(process.cwd(), migrationFile)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        error: `Migration file not found: ${migrationFile}` 
      }, { status: 404 })
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8')
    
    // Execute the SQL migration
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    })
    
    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({ 
        error: `Failed to apply migration: ${error.message}` 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully applied migration: ${migrationFile}` 
    })
  } catch (error: any) {
    console.error('Error applying migration:', error)
    return NextResponse.json({ 
      error: `An unexpected error occurred: ${error.message}` 
    }, { status: 500 })
  }
} 