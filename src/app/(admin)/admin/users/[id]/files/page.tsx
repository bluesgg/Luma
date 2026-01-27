import type { Metadata } from 'next'
import { UserFileStats } from '@/components/admin/user-file-stats'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'User Files - Admin - Luma',
  description: 'View user file statistics',
}

export default function UserFilesPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          User File Statistics
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          View file uploads and storage usage
        </p>
      </div>

      <UserFileStats userId={params.id} />
    </div>
  )
}
