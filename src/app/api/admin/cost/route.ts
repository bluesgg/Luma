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

    // Get AI usage logs
    const aiLogs = await prisma.aIUsageLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        model: true,
        inputTokens: true,
        outputTokens: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Calculate totals
    const totalInputTokens = aiLogs.reduce(
      (sum, log) => sum + log.inputTokens,
      0
    )
    const totalOutputTokens = aiLogs.reduce(
      (sum, log) => sum + log.outputTokens,
      0
    )

    // Estimate cost (example pricing: $3/1M input tokens, $15/1M output tokens for Claude)
    const estimatedCost =
      (totalInputTokens / 1000000) * 3 + (totalOutputTokens / 1000000) * 15

    // Group by model
    const modelMap = new Map<
      string,
      { inputTokens: number; outputTokens: number }
    >()
    aiLogs.forEach((log) => {
      if (!modelMap.has(log.model)) {
        modelMap.set(log.model, { inputTokens: 0, outputTokens: 0 })
      }
      const stats = modelMap.get(log.model)!
      stats.inputTokens += log.inputTokens
      stats.outputTokens += log.outputTokens
    })

    const byModel = Array.from(modelMap.entries()).map(([model, stats]) => ({
      model,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      cost:
        (stats.inputTokens / 1000000) * 3 + (stats.outputTokens / 1000000) * 15,
    }))

    // Group by date
    const dailyMap = new Map<
      string,
      { inputTokens: number; outputTokens: number }
    >()
    aiLogs.forEach((log) => {
      const date = log.createdAt.toISOString().split('T')[0]!
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { inputTokens: 0, outputTokens: 0 })
      }
      const stats = dailyMap.get(date)!
      stats.inputTokens += log.inputTokens
      stats.outputTokens += log.outputTokens
    })

    const dailyTrend = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      cost:
        (stats.inputTokens / 1000000) * 3 + (stats.outputTokens / 1000000) * 15,
    }))

    return successResponse({
      totalInputTokens,
      totalOutputTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      byModel,
      dailyTrend,
    })
  } catch (error) {
    return handleError(error)
  }
}
