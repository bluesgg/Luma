import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Validation schema for preferences update
 */
const updatePreferencesSchema = z
  .object({
    uiLocale: z.enum(['en', 'zh']).optional(),
    explainLocale: z.enum(['en', 'zh']).optional(),
  })
  .strict() // Reject unknown fields
  .refine(
    (data) => data.uiLocale !== undefined || data.explainLocale !== undefined,
    {
      message: 'At least one field must be provided',
    }
  )

/**
 * GET /api/preferences - Get user preferences
 * Creates default preferences if they don't exist
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth()

    // Try to find existing preferences
    let preference = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    })

    // Create default preferences if they don't exist
    if (!preference) {
      preference = await prisma.userPreference.create({
        data: {
          userId: user.id,
          uiLocale: 'en',
          explainLocale: 'en',
        },
      })
    }

    return successResponse({
      id: preference.id,
      userId: preference.userId,
      uiLocale: preference.uiLocale,
      explainLocale: preference.explainLocale,
      updatedAt: preference.updatedAt.toISOString(),
    })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * PATCH /api/preferences - Update user preferences
 * Creates preferences if they don't exist (upsert)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid JSON in request body',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const validation = updatePreferencesSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { uiLocale, explainLocale } = validation.data

    // Upsert preferences
    const preference = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        ...(uiLocale !== undefined && { uiLocale }),
        ...(explainLocale !== undefined && { explainLocale }),
      },
      create: {
        userId: user.id,
        uiLocale: uiLocale ?? 'en',
        explainLocale: explainLocale ?? 'en',
      },
    })

    return successResponse({
      id: preference.id,
      userId: preference.userId,
      uiLocale: preference.uiLocale,
      explainLocale: preference.explainLocale,
      updatedAt: preference.updatedAt.toISOString(),
    })
  } catch (error) {
    return handleError(error)
  }
}
