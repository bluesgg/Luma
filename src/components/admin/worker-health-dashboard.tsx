'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface WorkerJob {
  fileId: string
  fileName: string
  status: 'PENDING' | 'PROCESSING' | 'FAILED'
  startedAt: string | null
  duration: number | null
  error: string | null
  isZombie: boolean
}

interface WorkerSummary {
  active: number
  pending: number
  failed: number
  zombie: number
}

interface WorkerData {
  summary: WorkerSummary
  jobs: WorkerJob[]
}

export function WorkerHealthDashboard() {
  const [workerData, setWorkerData] = useState<WorkerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkerData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/admin/workers')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error?.message || 'Failed to fetch worker data'
          )
        }

        setWorkerData(result.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load worker data'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkerData()

    // Refresh every 10 seconds
    const interval = setInterval(fetchWorkerData, 10000)
    return () => clearInterval(interval)
  }, [])

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

  if (!workerData) {
    return null
  }

  const { summary, jobs } = workerData

  const getStatusBadge = (job: WorkerJob) => {
    if (job.isZombie) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Zombie
        </Badge>
      )
    }

    switch (job.status) {
      case 'PROCESSING':
        return (
          <Badge variant="default" className="gap-1">
            <Activity className="h-3 w-3" />
            Processing
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending}</div>
            <p className="text-xs text-muted-foreground">Waiting in queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.failed}</div>
            <p className="text-xs text-muted-foreground">Processing failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zombie Jobs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.zombie}</div>
            <p className="text-xs text-muted-foreground">
              Stuck for {'>'} 10 min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zombie warning */}
      {summary.zombie > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {summary.zombie} zombie job{summary.zombie > 1 ? 's' : ''} detected!
            These jobs have been processing for more than 10 minutes and may
            need manual intervention.
          </AlertDescription>
        </Alert>
      )}

      {/* Jobs table */}
      <Card>
        <CardHeader>
          <CardTitle>Active and Failed Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
              <p className="text-lg font-medium text-gray-900">All Clear!</p>
              <p className="text-sm text-gray-500">
                No active, pending, or failed jobs
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.fileId}>
                    <TableCell className="font-medium">
                      <div className="max-w-xs truncate" title={job.fileName}>
                        {job.fileName}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(job)}</TableCell>
                    <TableCell>
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell>{formatDuration(job.duration)}</TableCell>
                    <TableCell>
                      {job.error ? (
                        <div
                          className="max-w-xs truncate text-red-600"
                          title={job.error}
                        >
                          {job.error}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
