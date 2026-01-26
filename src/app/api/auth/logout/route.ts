import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuthError, createAuthSuccess } from '@/lib/auth'
import { AUTH_ERROR_CODES } from '@/types'
import { logger } from '@/lib/logger'
import { requireCsrf } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    const csrfError = await requireCsrf(request)
    if (csrfError) return csrfError

    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('Supabase logout error', error, { action: 'logout' })
      return NextResponse.json(
        createAuthError(
          AUTH_ERROR_CODES.INTERNAL_ERROR,
          'Logout failed. Please try again'
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createAuthSuccess({
        message: 'Logged out successfully',
      }),
      { status: 200 }
    )
  } catch (error) {
    logger.error('Logout error', error, { action: 'logout' })
    return NextResponse.json(
      createAuthError(
        AUTH_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred'
      ),
      { status: 500 }
    )
  }
}
