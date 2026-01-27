'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  HardDrive,
  FileText,
  Calendar,
  FolderOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FileStatsResponse {
  userId: string
  email: string
  summary: {
    totalFiles: number
    totalStorage: string
    totalPages: number
    filesByStatus: Record<string, number>
  }
  byCourse: Array<{
    courseId: string
    courseName: string
    fileCount: number
    storageUsed: string
  }>
  uploadTimeline: Array<{
    date: string
    count: number
    size: string
  }>
}

interface UserFileStatsProps {
  userId: string
}

export function UserFileStats({ userId }: UserFileStatsProps) {
  const [data, setData] = useState<FileStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFileStats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/users/${userId}/files`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error?.message || 'Failed to fetch file statistics'
          )
        }

        setData(result.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load file statistics'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchFileStats()
  }, [userId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return null
  }

  const formatBytes = (bytes: string) => {
    const num = BigInt(bytes)
    const kb = Number(num) / 1024
    const mb = kb / 1024
    const gb = mb / 1024

    if (gb >= 1) return `${gb.toFixed(2)} GB`
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    if (kb >= 1) return `${kb.toFixed(2)} KB`
    return `${Number(num)} B`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'READY':
        return 'default'
      case 'PROCESSING':
        return 'secondary'
      case 'UPLOADING':
        return 'outline'
      case 'FAILED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Calculate storage percentage (assuming 5GB limit from constants)
  const storageLimit = 5 * 1024 * 1024 * 1024 // 5GB in bytes
  const storageUsed = Number(BigInt(data.summary.totalStorage))
  const storagePercentage = (storageUsed / storageLimit) * 100

  return (
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Email:</span>
            <span className="text-sm font-medium">{data.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">User ID:</span>
            <span className="font-mono text-sm text-gray-500">
              {data.userId}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Storage Summary */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Storage Usage</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.summary.totalFiles}
              </div>
              <p className="text-xs text-gray-500">
                {data.summary.totalPages} total pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Storage Used
              </CardTitle>
              <HardDrive className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBytes(data.summary.totalStorage)}
              </div>
              <p className="text-xs text-gray-500">of 5 GB limit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">File Status</CardTitle>
              <FolderOpen className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.summary.filesByStatus).map(
                  ([status, count]) => (
                    <Badge key={status} variant={getStatusBadgeVariant(status)}>
                      {status}: {count}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storage Quota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress
              value={storagePercentage}
              className={
                storagePercentage >= 90
                  ? 'bg-red-100'
                  : storagePercentage >= 70
                    ? 'bg-yellow-100'
                    : ''
              }
            />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {formatBytes(data.summary.totalStorage)} used
              </span>
              <span className="text-gray-600">
                {storagePercentage.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files by Course */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Files by Course</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>File Count</TableHead>
                  <TableHead>Storage Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byCourse.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-gray-500"
                    >
                      No files found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byCourse.map((course) => (
                    <TableRow key={course.courseId}>
                      <TableCell className="font-medium">
                        {course.courseName}
                      </TableCell>
                      <TableCell>{course.fileCount}</TableCell>
                      <TableCell>{formatBytes(course.storageUsed)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Upload Timeline */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Calendar className="h-5 w-5" />
          Upload Timeline
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Files Uploaded</TableHead>
                  <TableHead>Total Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.uploadTimeline.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-gray-500"
                    >
                      No upload history
                    </TableCell>
                  </TableRow>
                ) : (
                  data.uploadTimeline.map((entry) => (
                    <TableRow key={entry.date}>
                      <TableCell className="font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{entry.count}</TableCell>
                      <TableCell>{formatBytes(entry.size)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
