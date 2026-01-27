import type { Metadata } from 'next'
import { CostDashboard } from '@/components/admin/cost-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cost Monitoring - Admin - Luma',
  description: 'Monitor AI and Mathpix costs',
}

export default function CostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cost Monitoring</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track AI and Mathpix usage costs
        </p>
      </div>

      <CostDashboard />
    </div>
  )
}
