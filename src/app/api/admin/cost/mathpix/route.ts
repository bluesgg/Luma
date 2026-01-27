import type { NextRequest } from 'next/server'
import { successResponse, handleError } from '@/lib/api-response'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d'

    // Calculate date range
    const now = new Date()
    const startDate = new Date()
    if (period === '7d') {
      startDate.setDate(now.getDate() - 7)
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30)
    } else {
      startDate.setDate(now.getDate() - 7)
    }

    // Get Mathpix usage
    const mathpixLogs = await prisma.mathpixUsage.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    const totalRequests = mathpixLogs.length
    const costPerRequest = 0.004
    const estimatedCost = totalRequests * costPerRequest

    // Top users
    const userMap = new Map<string, { email: string; count: number }>()
    mathpixLogs.forEach((log) => {
      if (!userMap.has(log.userId)) {
        userMap.set(log.userId, { email: log.user.email, count: 0 })
      }
      userMap.get(log.userId)!.count++
    })

    const topUsers = Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        email: data.email,
        requestCount: data.count,
        cost: Math.round(data.count * costPerRequest * 100) / 100,
      }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10)

    // Daily trend
    const dailyMap = new Map<string, number>()
    mathpixLogs.forEach((log) => {
      const date = log.createdAt.toISOString().split('T')[0]!
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
    })

    const dailyTrend = Array.from(dailyMap.entries()).map(
      ([date, requests]) => ({
        date,
        requests,
        cost: Math.round(requests * costPerRequest * 100) / 100,
      })
    )

    return successResponse({
      totalRequests,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      topUsers,
      dailyTrend,
    })
  } catch (error) {
    return handleError(error)
  }
}
