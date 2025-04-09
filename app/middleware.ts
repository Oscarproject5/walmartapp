import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/reset-password', '/']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  
  // Create supabase middleware client
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()
  
  // Check if route should be protected
  const isProtectedRoute = !publicRoutes.some(route => pathname.startsWith(route))
  
  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !session) {
    // Save the original URL for redirection after login
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectUrl', pathname)
    return NextResponse.redirect(url)
  }
  
  // If on an auth page but already logged in, redirect to dashboard instead of profile
  if (!isProtectedRoute && session && pathname !== '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  
  return res
}

// Match all routes except public assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api/public).*)',
  ],
} 