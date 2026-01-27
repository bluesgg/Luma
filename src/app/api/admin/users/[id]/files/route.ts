import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { requireAdmin } from '@/lib/admin-auth'
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
      },
    })

    if (!user) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'User not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Get file statistics
    const files = await prisma.file.findMany({
      where: {
        course: {
          userId,
        },
      },
      select: {
        id: true,
        fileSize: true,
        pageCount: true,
        status: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate summary
    const totalFiles = files.length
    const totalStorage = files.reduce((sum, f) => sum + f.fileSize, BigInt(0))
    const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0)

    // Group by status
    const filesByStatus: Record<string, number> = {}
    files.forEach((file) => {
      filesByStatus[file.status] = (filesByStatus[file.status] || 0) + 1
    })

    // Group by course
    const courseMap = new Map<
      string,
      { courseName: string; fileCount: number; storageUsed: bigint }
    >()
    files.forEach((file) => {
      if (!courseMap.has(file.course.id)) {
        courseMap.set(file.course.id, {
          courseName: file.course.name,
          fileCount: 0,
          storageUsed: BigInt(0),
        })
      }
      const stats = courseMap.get(file.course.id)!
      stats.fileCount++
      stats.storageUsed += file.fileSize
    })

    const byCourse = Array.from(courseMap.entries()).map(
      ([courseId, stats]) => ({
        courseId,
        courseName: stats.courseName,
        fileCount: stats.fileCount,
        storageUsed: stats.storageUsed.toString(),
      })
    )

    // Upload timeline (group by date)
    const timelineMap = new Map<string, { count: number; size: bigint }>()
    files.forEach((file) => {
      const date = file.createdAt.toISOString().split('T')[0]!
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { count: 0, size: BigInt(0) })
      }
      const stats = timelineMap.get(date)!
      stats.count++
      stats.size += file.fileSize
    })

    const uploadTimeline = Array.from(timelineMap.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        size: stats.size.toString(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return successResponse({
      userId: user.id,
      email: user.email,
      summary: {
        totalFiles,
        totalStorage: totalStorage.toString(),
        totalPages,
        filesByStatus,
      },
      byCourse,
      uploadTimeline,
    })
  } catch (error) {
    return handleError(error)
  }
}
