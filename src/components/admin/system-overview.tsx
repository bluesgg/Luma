'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  FileText,
  HardDrive,
  Activity,
  UserPlus,
  Loader2,
} from 'lucide-react'
import { StatCard } from './stat-card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SystemStats {
  totalUsers: number
  totalFiles: number
  totalStorageUsed: string
  activeUsers: number
  newUsersThisMonth: number
  filesProcessing: number
}

export function SystemOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/admin/stats')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to fetch stats')
        }

        setStats(result.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load statistics'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
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

  if (!stats) {
    return null
  }

  const storageUsedGB = (
    BigInt(stats.totalStorageUsed) / BigInt(1024 * 1024 * 1024)
  ).toString()

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={Users}
        description="Registered users"
      />
      <StatCard
        title="Active Users"
        value={stats.activeUsers}
        icon={Activity}
        description="Active in last 7 days"
      />
      <StatCard
        title="New Users"
        value={stats.newUsersThisMonth}
        icon={UserPlus}
        description="This month"
      />
      <StatCard
        title="Total Files"
        value={stats.totalFiles}
        icon={FileText}
        description="Uploaded files"
      />
      <StatCard
        title="Storage Used"
        value={`${storageUsedGB} GB`}
        icon={HardDrive}
        description="Total storage"
      />
      <StatCard
        title="Processing"
        value={stats.filesProcessing}
        icon={Loader2}
        description="Files processing"
      />
    </div>
  )
}
