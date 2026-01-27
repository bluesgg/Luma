'use client'

import { useEffect, useState } from 'react'
import { Loader2, Database, ArrowUpDown, History } from 'lucide-react'
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
import { QuotaAdjustmentForm } from './quota-adjustment-form'

interface QuotaData {
  bucket: string
  used: number
  limit: number
  resetAt: string
}

interface QuotaLog {
  id: string
  bucket: string
  change: number
  reason: string
  metadata: {
    action?: string
    adminReason?: string
    adminId?: string
    adminEmail?: string
  }
  createdAt: string
}

interface QuotaResponse {
  user: {
    id: string
    email: string
    createdAt: string
  }
  quotas: QuotaData[]
  recentLogs: QuotaLog[]
}

interface UserQuotaManagementProps {
  userId: string
}

export function UserQuotaManagement({ userId }: UserQuotaManagementProps) {
  const [data, setData] = useState<QuotaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchQuotaData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/users/${userId}/quota`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to fetch quota data')
        }

        setData(result.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load quota data'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuotaData()
  }, [userId, refreshTrigger])

  const handleAdjustmentSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

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

  const formatBucketName = (bucket: string) => {
    return bucket
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getReasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case 'ADMIN_ADJUST':
        return 'default'
      case 'SYSTEM_RESET':
        return 'secondary'
      case 'CONSUME':
        return 'outline'
      case 'REFUND':
        return 'default'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Email:</span>
            <span className="text-sm font-medium">{data.user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">User ID:</span>
            <span className="font-mono text-sm text-gray-500">
              {data.user.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Created:</span>
            <span className="text-sm text-gray-500">
              {formatDate(data.user.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quota Status */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Quota Status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {data.quotas.map((quota) => {
            const percentage = (quota.used / quota.limit) * 100
            const isNearLimit = percentage >= 80
            const isAtLimit = percentage >= 100

            return (
              <Card key={quota.bucket}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {formatBucketName(quota.bucket)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Usage</span>
                      <span
                        className={
                          isAtLimit
                            ? 'font-medium text-red-600'
                            : 'text-gray-900'
                        }
                      >
                        {quota.used} / {quota.limit}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={
                        isAtLimit
                          ? 'bg-red-100'
                          : isNearLimit
                            ? 'bg-yellow-100'
                            : ''
                      }
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {percentage.toFixed(1)}% used
                      </span>
                      <span className="text-gray-500">
                        Resets: {formatDate(quota.resetAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Adjustment Form */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <ArrowUpDown className="h-5 w-5" />
          Adjust Quota
        </h2>
        <Card>
          <CardContent className="pt-6">
            <QuotaAdjustmentForm
              userId={userId}
              quotas={data.quotas}
              onSuccess={handleAdjustmentSuccess}
            />
          </CardContent>
        </Card>
      </div>

      {/* Change History */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <History className="h-5 w-5" />
          Recent Changes
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-500"
                    >
                      No recent changes
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {formatBucketName(log.bucket)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-medium ${
                            log.change > 0
                              ? 'text-green-600'
                              : log.change < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {log.change > 0 ? '+' : ''}
                          {log.change}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReasonBadgeVariant(log.reason)}>
                          {log.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.metadata.adminReason && (
                          <div className="max-w-md">
                            <p className="truncate">
                              {log.metadata.adminReason}
                            </p>
                            {log.metadata.adminEmail && (
                              <p className="text-xs text-gray-500">
                                by {log.metadata.adminEmail}
                              </p>
                            )}
                          </div>
                        )}
                        {log.metadata.action && !log.metadata.adminReason && (
                          <span className="text-xs text-gray-500">
                            Action: {log.metadata.action}
                          </span>
                        )}
                      </TableCell>
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
