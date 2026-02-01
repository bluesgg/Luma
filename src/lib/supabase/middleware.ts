/**
 * Supabase Middleware
 *
 * Refresh Supabase session for authenticated users
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '../env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Define protected routes that require authentication
  const protectedRoutes = ['/courses', '/files', '/reader', '/learn', '/settings']
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Define auth routes that should redirect to /courses if already authenticated
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    url.pathname = '/login'
    // Store the original URL to redirect back after login
    url.searchParams.set('redirect', pathname)
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies from supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // If user is authenticated and trying to access auth routes
  if (user && isAuthRoute) {
    url.pathname = '/courses'
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies from supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
