import { NextRequest, NextResponse } from 'next/server'
import { getUserIdAndClient } from '../../../lib/api-helpers'

/**
 * API route to set up a new user's resources
 * Called after successful signup to initialize default settings and data
 */
export async function POST(req: NextRequest) {
  const { userId, supabase } = await getUserIdAndClient()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // Create default app settings for the user
    const { error: settingsError } = await supabase.from('app_settings').insert({
      shipping_base_cost: 5.00,
      label_cost: 1.00,
      cancellation_shipping_loss: 5.00,
      minimum_profit_margin: 10.00,
      auto_reorder_enabled: false,
      auto_price_adjustment_enabled: false,
      user_id: userId
    })
    
    if (settingsError) {
      console.error('Error creating default settings:', settingsError)
      return NextResponse.json({ error: 'Failed to create default settings' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'User resources set up successfully'
    })
  } catch (error) {
    console.error('Error setting up user resources:', error)
    return NextResponse.json({ error: 'Failed to set up user resources' }, { status: 500 })
  }
} 