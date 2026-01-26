'use client'

import type { FileStatus } from '@prisma/client'

interface FileCardProps {
  id: string
  name: string
  pageCount?: number | null
  status: FileStatus
}

export function FileCard({ id, name, pageCount, status }: FileCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold truncate">{name}</h3>
      <p className="text-sm text-muted-foreground">
        {pageCount ? `${pageCount} pages` : 'Processing...'}
      </p>
      <span className="text-xs">{status}</span>
    </div>
  )
}
