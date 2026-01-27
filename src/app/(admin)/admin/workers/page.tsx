import type { Metadata } from 'next'
import { WorkerHealthDashboard } from '@/components/admin/worker-health-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Worker Health - Admin - Luma',
  description: 'Monitor background job health',
}

export default function WorkersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Worker Health</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor background job processing
        </p>
      </div>

      <WorkerHealthDashboard />
    </div>
  )
}
