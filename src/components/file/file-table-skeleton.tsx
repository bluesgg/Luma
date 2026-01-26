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
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ColumnName = 'name' | 'pages' | 'size' | 'status' | 'date' | 'actions'

export interface FileTableSkeletonProps
  extends React.HTMLAttributes<HTMLTableElement> {
  rows?: number
  columns?: ColumnName[]
}

const defaultColumns: ColumnName[] = ['name', 'pages', 'size', 'status', 'date', 'actions']

function FileTableSkeleton({
  rows = 5,
  columns = defaultColumns,
  className,
  ...props
}: FileTableSkeletonProps) {
  // Handle edge cases
  const rowCount = Math.max(0, rows)
  const displayColumns = columns || defaultColumns

  const columnConfig = {
    name: { header: 'Name', width: 'w-auto', skeletonWidth: 'w-48' },
    pages: { header: 'Pages', width: 'w-24', skeletonWidth: 'w-12' },
    size: { header: 'Size', width: 'w-24', skeletonWidth: 'w-16' },
    status: { header: 'Status', width: 'w-32', skeletonWidth: 'w-20' },
    date: { header: 'Upload Date', width: 'w-36', skeletonWidth: 'w-24' },
    actions: { header: 'Actions', width: 'w-24', skeletonWidth: 'w-16' },
  }

  return (
    <Table
      className={cn(className)}
      aria-busy="true"
      aria-label="Loading files..."
      {...props}
    >
      <TableHeader>
        <TableRow>
          {displayColumns.map((col) => (
            <TableHead
              key={col}
              scope="col"
              className={cn(columnConfig[col].width)}
            >
              {columnConfig[col].header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {displayColumns.map((col) => (
              <TableCell key={col}>
                <Skeleton
                  className={cn(
                    'h-4 rounded bg-muted',
                    columnConfig[col].skeletonWidth
                  )}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { FileTableSkeleton }
