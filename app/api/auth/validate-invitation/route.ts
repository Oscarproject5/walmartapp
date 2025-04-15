import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    
    if (!code) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invitation code is required' 
      }, { status: 400 })
    }
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Check if the invitation code is valid using the database function
    const { data, error } = await supabase
      .rpc('is_invitation_valid', { invite_code: code })
    
    if (error) {
      console.error('Error validating invitation:', error)
      return NextResponse.json({ 
        valid: false, 
        error: 'Failed to validate invitation code' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ valid: data })
  } catch (error) {
    console.error('Error in validate-invitation API:', error)
    return NextResponse.json({ 
      valid: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
} 