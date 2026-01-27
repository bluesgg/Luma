import type { NextRequest } from 'next/server'
import { successResponse, handleError, HTTP_STATUS } from '@/lib/api-response'
import { requireAdmin } from '@/lib/admin-auth'
import { PAGINATION } from '@/lib/constants'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(
      parseInt(
        searchParams.get('pageSize') || String(PAGINATION.DEFAULT_PAGE_SIZE)
      ),
      PAGINATION.MAX_PAGE_SIZE
    )
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * pageSize

    // Build where clause
    const where = search
      ? {
          email: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {}

    // Get users with pagination
    const [users, total] = await Promise.all([
      (prisma.user.findMany as any)({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          quotas: {
            select: {
              bucket: true,
              used: true,
              limit: true,
            },
          },
          _count: {
            select: {
              files: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    // Format response
    const items = (users as any[]).map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      emailConfirmedAt: user.emailConfirmedAt?.toISOString() || null,
      isLocked: user.lockedUntil
        ? new Date(user.lockedUntil) > new Date()
        : false,
      quotaSummary: (user.quotas || []).reduce(
        (acc: Record<string, { used: number; limit: number }>, q: any) => {
          const key =
            q.bucket === 'LEARNING_INTERACTIONS'
              ? 'learningInteractions'
              : 'autoExplain'
          acc[key] = { used: q.used, limit: q.limit }
          return acc
        },
        {} as Record<string, { used: number; limit: number }>
      ),
      fileCount: (user as any)._count?.files || 0,
    }))

    return successResponse(
      {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      HTTP_STATUS.OK
    )
  } catch (error) {
    return handleError(error)
  }
}
