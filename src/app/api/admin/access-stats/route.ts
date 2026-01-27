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

    // Get access logs within period
    const accessLogs = await prisma.accessLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      select: {
        actionType: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Calculate totals
    const totalPageViews = accessLogs.filter(
      (log) => log.actionType === 'VIEW_FILE'
    ).length
    const totalQAUsage = accessLogs.filter(
      (log) => log.actionType === 'USE_QA'
    ).length
    const totalExplainUsage = accessLogs.filter(
      (log) => log.actionType === 'USE_EXPLAIN'
    ).length

    // Group by date
    const timelineMap = new Map<
      string,
      { pageViews: number; qaUsage: number; explainUsage: number }
    >()

    accessLogs.forEach((log) => {
      const date = log.timestamp.toISOString().split('T')[0]!
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { pageViews: 0, qaUsage: 0, explainUsage: 0 })
      }
      const stats = timelineMap.get(date)!
      if (log.actionType === 'VIEW_FILE') stats.pageViews++
      if (log.actionType === 'USE_QA') stats.qaUsage++
      if (log.actionType === 'USE_EXPLAIN') stats.explainUsage++
    })

    const timeline = Array.from(timelineMap.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }))

    // Breakdown by action
    const breakdownByAction: Record<string, number> = {}
    accessLogs.forEach((log) => {
      breakdownByAction[log.actionType] =
        (breakdownByAction[log.actionType] || 0) + 1
    })

    return successResponse({
      totalPageViews,
      totalQAUsage,
      totalExplainUsage,
      timeline,
      breakdown: {
        byAction: breakdownByAction,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
