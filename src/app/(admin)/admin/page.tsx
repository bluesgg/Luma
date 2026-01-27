import type { Metadata } from 'next'
import { SystemOverview } from '@/components/admin/system-overview'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Luma',
  description: 'Luma admin dashboard',
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          System overview and statistics
        </p>
      </div>

      <SystemOverview />
    </div>
  )
}
