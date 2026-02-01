import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { isTokenExpired } from '@/lib/token';
import { confirmResetSchema } from '@/lib/validation';
import { successResponse, errorResponse, ERROR_CODES } from '@/lib/api-response';
import { requireCsrfToken } from '@/lib/csrf';

/**
 * POST /api/auth/confirm-reset
 * Confirm password reset with token and new password
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCsrfToken(request);

    // Parse and validate request body
    const body = await request.json();
    const validationResult = confirmResetSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationResult.error.issues[0].message,
        400
      );
    }

    const { token, password } = validationResult.data;

    // Find password reset token
    const resetToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return errorResponse(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired reset token.', 400);
    }

    // Check if token is expired
    if (isTokenExpired(resetToken.expiresAt)) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token: resetToken.token },
      });

      return errorResponse(ERROR_CODES.TOKEN_EXPIRED, 'Reset token has expired. Please request a new one.', 400);
    }

    // Check token type
    if (resetToken.type !== 'PASSWORD_RESET') {
      return errorResponse(ERROR_CODES.INVALID_TOKEN, 'Invalid token type.', 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update user password, reset failed login count, clear lockout, and delete token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: newPasswordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      prisma.verificationToken.delete({
        where: { token: resetToken.token },
      }),
    ]);

    return successResponse({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    logger.error('Password reset confirmation error:', error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An error occurred during password reset. Please try again.',
      500
    );
  }
}
