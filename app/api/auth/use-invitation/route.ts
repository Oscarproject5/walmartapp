import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    
    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invitation code is required' 
      }, { status: 400 })
    }
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    // Use the invitation with the user's ID
    const { data, error } = await supabase
      .rpc('use_invitation', { 
        invite_code: code,
        user_id: session.user.id
      })
    
    if (error) {
      console.error('Error using invitation:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to use invitation code' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ success: data })
  } catch (error) {
    console.error('Error in use-invitation API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
} 