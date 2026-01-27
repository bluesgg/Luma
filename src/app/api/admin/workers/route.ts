import type { NextRequest } from 'next/server'
import { successResponse, handleError } from '@/lib/api-response'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    // Get all files with their structure processing status
    const files = await prisma.file.findMany({
      where: {
        structureStatus: {
          in: ['PENDING', 'PROCESSING', 'FAILED'],
        },
      },
      select: {
        id: true,
        name: true,
        structureStatus: true,
        structureError: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Detect zombie jobs (processing for >10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    const jobs = files.map((file) => {
      const isZombie =
        file.structureStatus === 'PROCESSING' && file.updatedAt < tenMinutesAgo
      const duration =
        file.structureStatus === 'PROCESSING'
          ? Date.now() - file.updatedAt.getTime()
          : null

      return {
        fileId: file.id,
        fileName: file.name,
        status: file.structureStatus,
        startedAt:
          file.structureStatus === 'PROCESSING'
            ? file.updatedAt.toISOString()
            : null,
        duration: duration ? Math.floor(duration / 1000) : null, // seconds
        error: file.structureError,
        isZombie,
      }
    })

    const summary = {
      active: jobs.filter((j) => j.status === 'PROCESSING' && !j.isZombie)
        .length,
      pending: jobs.filter((j) => j.status === 'PENDING').length,
      failed: jobs.filter((j) => j.status === 'FAILED').length,
      zombie: jobs.filter((j) => j.isZombie).length,
    }

    return successResponse({
      summary,
      jobs,
    })
  } catch (error) {
    return handleError(error)
  }
}
