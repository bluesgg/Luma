import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { requireAdmin, createAuditLog } from '@/lib/admin-auth'
import { quotaAdjustmentSchema } from '@/lib/validation'
import { ERROR_CODES } from '@/lib/constants'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    await requireAdmin()
    const { id: userId } = await params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })

    if (!user) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'User not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Get all quotas for this user
    const quotas = await prisma.quota.findMany({
      where: { userId },
      orderBy: { bucket: 'asc' },
    })

    // Get recent quota change history
    const quotaLogs = await prisma.quotaLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      quotas: quotas.map((q) => ({
        bucket: q.bucket,
        used: q.used,
        limit: q.limit,
        resetAt: q.resetAt.toISOString(),
      })),
      recentLogs: quotaLogs.map((log) => ({
        id: log.id,
        bucket: log.bucket,
        change: log.change,
        reason: log.reason,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const admin = await requireAdmin()
    const { id: userId } = await params

    // Parse and validate request body
    const body = await request.json()
    const validation = quotaAdjustmentSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        validation.error.errors
      )
    }

    const { bucket, action, value, reason } = validation.data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'User not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Get current quota
    const quota = await prisma.quota.findUnique({
      where: {
        userId_bucket: {
          userId,
          bucket,
        },
      },
    })

    if (!quota) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'Quota not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    let newLimit = quota.limit
    let newUsed = quota.used

    // Apply action
    switch (action) {
      case 'set_limit':
        if (value === undefined) {
          return errorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Value is required for set_limit action',
            HTTP_STATUS.BAD_REQUEST
          )
        }
        newLimit = value
        break
      case 'adjust_used':
        if (value === undefined) {
          return errorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Value is required for adjust_used action',
            HTTP_STATUS.BAD_REQUEST
          )
        }
        newUsed = Math.max(0, quota.used + value)
        break
      case 'reset':
        newUsed = 0
        break
    }

    // Update quota
    const updatedQuota = await prisma.quota.update({
      where: {
        userId_bucket: {
          userId,
          bucket,
        },
      },
      data: {
        used: newUsed,
        limit: newLimit,
      },
    })

    // Create quota log
    await prisma.quotaLog.create({
      data: {
        userId,
        bucket,
        change:
          action === 'set_limit'
            ? newLimit - quota.limit
            : newUsed - quota.used,
        reason: 'ADMIN_ADJUST',
        metadata: {
          action,
          adminReason: reason,
          adminId: admin.id,
          adminEmail: admin.email,
        },
      },
    })

    // Create audit log
    await createAuditLog(admin.id, 'QUOTA_ADJUSTMENT', {
      userId,
      userEmail: user.email,
      bucket,
      action,
      value,
      reason,
      oldLimit: quota.limit,
      newLimit,
      oldUsed: quota.used,
      newUsed,
    })

    return successResponse({
      quota: {
        bucket: updatedQuota.bucket,
        used: updatedQuota.used,
        limit: updatedQuota.limit,
      },
      message: 'Quota adjusted successfully',
    })
  } catch (error) {
    return handleError(error)
  }
}
