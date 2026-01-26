'use client'

import type { FileStatus } from '@prisma/client'
import { FileCard } from './file-card'

interface FileItem {
  id: string
  name: string
  pageCount?: number | null
  status: FileStatus
}

interface FileListProps {
  files: FileItem[]
}

export function FileList({ files }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No files yet. Upload your first PDF to get started.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          id={file.id}
          name={file.name}
          pageCount={file.pageCount}
          status={file.status}
        />
      ))}
    </div>
  )
}
