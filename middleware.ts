import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { SECURITY, ADMIN_SECURITY } from '@/lib/constants'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/verify',
  '/api/auth/reset-password',
  '/api/auth/confirm-reset',
  '/api/auth/resend-verification',
  '/api/csrf',
]

// Auth routes that redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

// Admin routes that require admin authentication
const ADMIN_ROUTES = ['/admin']
const ADMIN_AUTH_ROUTES = ['/admin/login']
const ADMIN_API_ROUTES = ['/api/admin']
const ADMIN_PUBLIC_ROUTES = ['/api/admin/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check route types
  const isHomePage = pathname === '/'
  const isPublicRoute =
    isHomePage || PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminAuthRoute = ADMIN_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAdminApiRoute = ADMIN_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAdminPublicRoute = ADMIN_PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isApiRoute = pathname.startsWith('/api')

  // Get session cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SECURITY.SESSION_COOKIE_NAME)
  const adminSessionCookie = cookieStore.get(ADMIN_SECURITY.SESSION_COOKIE_NAME)
  const isAuthenticated = !!sessionCookie?.value
  const isAdminAuthenticated = !!adminSessionCookie?.value

  // Handle admin routes
  if (isAdminRoute || isAdminApiRoute) {
    // Allow public admin routes (login API)
    if (isAdminPublicRoute) {
      return NextResponse.next()
    }

    // If admin is authenticated and trying to access admin login page, redirect to admin dashboard
    if (isAdminAuthenticated && isAdminAuthRoute) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // If admin is not authenticated and trying to access protected admin routes
    if (!isAdminAuthenticated) {
      // For admin API routes, return 401
      if (isAdminApiRoute) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ADMIN_UNAUTHORIZED',
              message: 'Admin authentication required',
            },
          },
          { status: 401 }
        )
      }

      // For admin page routes, redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return NextResponse.next()
  }

  // Handle regular user routes
  // If user is authenticated and trying to access auth pages, redirect to home
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not authenticated and trying to access protected routes
  if (!isAuthenticated && !isPublicRoute) {
    // For API routes, return 401
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_UNAUTHORIZED',
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    // For page routes, redirect to login
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
