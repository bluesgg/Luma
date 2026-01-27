import type { NextRequest } from 'next/server'
import { registerSchema } from '@/lib/validation'
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  handleError,
} from '@/lib/api-response'
import { ERROR_CODES, QUOTA_LIMITS } from '@/lib/constants'
import { hashPassword } from '@/lib/password'
import { generateVerificationToken } from '@/lib/token'
import { sendVerificationEmail } from '@/lib/email'
import { authRateLimit } from '@/lib/rate-limit'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { email: rawEmail, password } = validation.data

    // Normalize email to lowercase and trim whitespace
    const email = rawEmail.toLowerCase().trim()

    // Rate limiting by email
    const rateLimitResult = await authRateLimit(email)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many registration attempts. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'An account with this email already exists',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user and initialize quotas in a single transaction
    // This ensures atomic creation - both user and quotas are created together
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'STUDENT',
          failedLoginAttempts: 0,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          emailConfirmedAt: true,
        },
      })

      // Initialize quotas within the same transaction
      const now = new Date()
      const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      await tx.quota.createMany({
        data: [
          {
            userId: newUser.id,
            bucket: 'LEARNING_INTERACTIONS',
            used: 0,
            limit: QUOTA_LIMITS.LEARNING_INTERACTIONS,
            resetAt,
          },
          {
            userId: newUser.id,
            bucket: 'AUTO_EXPLAIN',
            used: 0,
            limit: QUOTA_LIMITS.AUTO_EXPLAIN,
            resetAt,
          },
        ],
      })

      logger.info('User and quotas created atomically', { userId: newUser.id })

      return newUser
    })

    // Generate verification token
    const { token } = await generateVerificationToken(user.id, 'EMAIL_VERIFY')

    // Send verification email (don't wait for it to complete)
    sendVerificationEmail(email, token).catch((error) => {
      logger.error('Failed to send verification email', { error, email })
    })

    logger.info('User registered successfully', { userId: user.id, email })

    return successResponse(
      {
        user,
        message:
          'Registration successful. Please check your email to verify your account.',
      },
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    return handleError(error)
  }
}
