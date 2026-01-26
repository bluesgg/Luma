'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileStatusBadge } from './file-status-badge'
import { cn, formatFileSize } from '@/lib/utils'
import {
  FileText,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Download,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FileStatus } from '@prisma/client'

// ============================================
// Types
// ============================================

interface FileItem {
  id: string
  name: string
  pageCount: number | null
  fileSize: number | null
  isScanned: boolean
  status: FileStatus
  createdAt: string
}

export interface FileTableProps extends Omit<React.HTMLAttributes<HTMLTableElement>, 'onSelect'> {
  files: FileItem[]
  onOpen?: (fileId: string) => void
  onDelete?: (fileId: string) => void
  onDownload?: (fileId: string) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  showRelativeTime?: boolean
  selectable?: boolean
  onSelect?: (fileId: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  selectedIds?: string[]
  compact?: boolean
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return '-'
  }
}

// ============================================
// Component
// ============================================

function FileTable({
  files,
  onOpen,
  onDelete,
  onDownload,
  onSort,
  sortBy,
  sortOrder,
  selectable,
  onSelect,
  onSelectAll,
  selectedIds = [],
  className,
  ...props
}: FileTableProps) {
  const handleSort = (column: string) => {
    if (!onSort) return
    const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc'
    onSort(column, newOrder)
  }

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    )
  }

  return (
    <Table
      className={cn(className)}
      aria-label="Files table"
      {...props}
    >
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead scope="col" className="w-12">
              <input
                type="checkbox"
                checked={
                  files.length > 0 && selectedIds.length === files.length
                }
                onChange={(e) => onSelectAll?.(e.target.checked)}
                aria-label="Select all files"
                className="cursor-pointer"
              />
            </TableHead>
          )}
          <TableHead
            scope="col"
            className={cn('cursor-pointer', onSort && 'hover:bg-muted/50')}
            onClick={() => handleSort('name')}
          >
            <span className="flex items-center">
              Name
              {renderSortIcon('name')}
            </span>
          </TableHead>
          <TableHead scope="col" className="w-24">
            Pages
          </TableHead>
          <TableHead scope="col" className="w-24">
            Size
          </TableHead>
          <TableHead scope="col" className="w-32">
            Status
          </TableHead>
          <TableHead
            scope="col"
            className={cn(
              'w-36 cursor-pointer',
              onSort && 'hover:bg-muted/50'
            )}
            onClick={() => handleSort('createdAt')}
          >
            <span className="flex items-center">
              Upload Date
              {renderSortIcon('createdAt')}
            </span>
          </TableHead>
          <TableHead scope="col" className="w-24 text-right">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const isReady = file.status === 'ready'
          const isSelected = selectedIds.includes(file.id)

          const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (isReady && onOpen) {
                onOpen(file.id)
              }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
              e.preventDefault()
              if (onDelete) {
                onDelete(file.id)
              }
            }
          }

          return (
            <TableRow
              key={file.id}
              tabIndex={0}
              role="row"
              aria-selected={isSelected}
              onKeyDown={handleRowKeyDown}
              className={cn(
                'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
                isSelected && 'bg-muted'
              )}
              data-state={isSelected ? 'selected' : undefined}
            >
              {selectable && (
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect?.(file.id, e.target.checked)}
                    aria-label={`Select ${file.name}`}
                    className="cursor-pointer"
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate max-w-[200px]" title={file.name}>
                    {file.name}
                  </span>
                  {file.isScanned && (
                    <span
                      data-testid="scanned-warning"
                      title="This PDF appears to be scanned. AI features may be limited."
                      aria-label="Scanned PDF warning"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {file.pageCount !== null ? file.pageCount : 'N/A'}
              </TableCell>
              <TableCell>{formatFileSize(file.fileSize)}</TableCell>
              <TableCell>
                <FileStatusBadge status={file.status} />
              </TableCell>
              <TableCell>{formatDate(file.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpen?.(file.id)}
                    disabled={!isReady}
                    aria-label="Open file"
                    className="h-8 w-8 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete?.(file.id)}
                    aria-label="Delete"
                    className="h-8 w-8 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {onDownload && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="More options"
                          className="h-8 w-8 cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isReady && (
                          <DropdownMenuItem
                            onClick={() => onDownload(file.id)}
                            className="cursor-pointer"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export { FileTable }
