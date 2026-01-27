import type { Metadata } from 'next'
import { UserListTable } from '@/components/admin/user-list-table'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'User Management - Admin - Luma',
  description: 'Manage users',
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage user accounts
        </p>
      </div>

      <UserListTable />
    </div>
  )
}
