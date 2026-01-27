import type { NextRequest } from 'next/server'
import { successResponse, handleError } from '@/lib/api-response'
import { SECURITY } from '@/lib/constants'
import { logger } from '@/lib/logger'

export async function POST(_request: NextRequest) {
  try {
    const response = successResponse({
      message: 'Logout successful',
    })

    // Clear session cookie
    response.cookies.set(SECURITY.SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    logger.info('User logged out')

    return response
  } catch (error) {
    return handleError(error)
  }
}
