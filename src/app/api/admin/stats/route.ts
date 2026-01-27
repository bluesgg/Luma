import type { NextRequest } from 'next/server'
import { successResponse, handleError } from '@/lib/api-response'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    // Get system statistics
    const [totalUsers, totalFiles, filesProcessing, storageAgg] =
      await Promise.all([
        prisma.user.count(),
        prisma.file.count(),
        prisma.file.count({
          where: {
            structureStatus: 'PROCESSING',
          },
        }),
        prisma.file.aggregate({
          _sum: {
            fileSize: true,
          },
        }),
      ])

    // Get active users (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: sevenDaysAgo,
        },
      },
    })

    // Get new users this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    return successResponse({
      totalUsers,
      totalFiles,
      totalStorageUsed: storageAgg._sum.fileSize?.toString() || '0',
      activeUsers,
      newUsersThisMonth,
      filesProcessing,
    })
  } catch (error) {
    return handleError(error)
  }
}
