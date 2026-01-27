import type { Metadata } from 'next'
import { UserQuotaManagement } from '@/components/admin/user-quota-management'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'User Quota Management - Admin - Luma',
  description: 'Manage user quota',
}

export default function UserQuotaPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          User Quota Management
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          View and adjust user quota limits
        </p>
      </div>

      <UserQuotaManagement userId={params.id} />
    </div>
  )
}
