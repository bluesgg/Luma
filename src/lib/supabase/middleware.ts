import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfig } from '@/lib/env'
import { ROUTES } from '@/lib/constants'
import {
  isAuthOnlyRoute,
  isProtectedRoute,
  isAdminRoute,
  isAdminLoginRoute,
  isCronRoute,
} from '@/lib/middleware/route-matchers'
import { validateCronSecret } from '@/lib/middleware/cron-validation'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle CRON routes first - they only need secret validation, no user session
  if (isCronRoute(pathname)) {
    if (!validateCronSecret(request.headers)) {
      return new NextResponse(
        JSON.stringify({ error: { code: 'CRON_UNAUTHORIZED', message: 'Invalid or missing authorization' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    // Valid CRON request - pass through
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
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

  // Check route types
  const isAuthOnly = isAuthOnlyRoute(pathname)
  const isProtected = isProtectedRoute(pathname)
  const isAdmin = isAdminRoute(pathname)
  const isAdminLogin = isAdminLoginRoute(pathname)

  // 1. Handle admin routes (redirect to admin login if not authenticated)
  if (!user && isAdmin && !isAdminLogin) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.REDIRECTS.ADMIN_UNAUTHENTICATED
    return NextResponse.redirect(url)
  }

  // 2. Handle protected routes - redirect unauthenticated users to login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.REDIRECTS.UNAUTHENTICATED
    return NextResponse.redirect(url)
  }

  // 3. Handle auth-only routes - redirect authenticated users to courses
  if (user && isAuthOnly) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.REDIRECTS.AFTER_LOGIN
    return NextResponse.redirect(url)
  }

  // 4. API routes (except public APIs and CRON) - let route handlers check auth
  // This allows API routes to return proper 401 responses instead of redirects

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
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
