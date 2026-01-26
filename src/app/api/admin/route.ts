import { NextResponse } from 'next/server'
import { getCurrentAdmin, createAuthError, createAuthSuccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AUTH_ERROR_CODES, ADMIN_ERROR_CODES } from '@/types'

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        createAuthError(ADMIN_ERROR_CODES.UNAUTHORIZED, 'Admin access required'),
        { status: 401 }
      )
    }

    // Get aggregated statistics
    const [
      userCount,
      courseCount,
      fileCount,
      aiUsage,
      recentUsers,
      quotaStats,
    ] = await Promise.all([
      // Total users
      prisma.profile.count(),

      // Total courses
      prisma.course.count(),

      // Total files
      prisma.file.count(),

      // AI usage aggregates
      prisma.aIUsageLog.aggregate({
        _sum: {
          inputTokens: true,
          outputTokens: true,
          costCents: true,
        },
        _count: true,
      }),

      // Recent user registrations (last 7 days)
      prisma.profile.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Quota usage statistics
      prisma.quota.aggregate({
        _sum: {
          used: true,
        },
        _avg: {
          used: true,
        },
      }),
    ])

    // File status breakdown
    const filesByStatus = await prisma.file.groupBy({
      by: ['status'],
      _count: true,
    })

    const stats = {
      users: {
        total: userCount,
        recentRegistrations: recentUsers,
      },
      courses: {
        total: courseCount,
      },
      files: {
        total: fileCount,
        byStatus: filesByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count
            return acc
          },
          {} as Record<string, number>
        ),
      },
      ai: {
        totalRequests: aiUsage._count,
        totalInputTokens: aiUsage._sum.inputTokens ?? 0,
        totalOutputTokens: aiUsage._sum.outputTokens ?? 0,
        totalCostDollars: (aiUsage._sum.costCents ?? 0) / 100,
      },
      quotas: {
        totalUsed: quotaStats._sum.used ?? 0,
        averageUsed: Math.round(quotaStats._avg.used ?? 0),
      },
    }

    return NextResponse.json(
      createAuthSuccess({
        stats,
        admin: {
          userId: admin.user.id,
          email: admin.user.email,
          role: admin.profile.role,
        },
      })
    )
  } catch (error) {
    logger.error('Admin API error', error, { action: 'admin-stats' })
    return NextResponse.json(
      createAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch admin statistics'),
      { status: 500 }
    )
  }
}
