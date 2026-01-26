'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronRight, Home } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export interface FilesBreadcrumbProps
  extends React.HTMLAttributes<HTMLElement> {
  courseName: string
  courseId: string
  showHomeIcon?: boolean
  isLoading?: boolean
  compact?: boolean
  maxVisibleItems?: number
  separator?: string
  'data-testid'?: string
}

function FilesBreadcrumb({
  courseName,
  courseId,
  showHomeIcon = false,
  isLoading = false,
  compact = false,
  separator,
  className,
  'data-testid': testId,
  ...props
}: FilesBreadcrumbProps) {
  // Safe course name
  const displayCourseName = courseName || 'Course'

  // Separator element
  const SeparatorElement = () =>
    separator ? (
      <span aria-hidden="true" className="text-slate-400 mx-2">
        {separator}
      </span>
    ) : (
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 text-slate-400 mx-2 flex-shrink-0"
      />
    )

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('', className)}
      data-testid={testId}
      {...props}
    >
      <ol className="flex items-center flex-wrap text-sm">
        {/* Courses Link */}
        <li className="flex items-center">
          <Link
            href="/courses"
            className="text-slate-600 hover:text-slate-900 transition-colors flex items-center cursor-pointer"
          >
            {showHomeIcon && (
              <Home className="h-4 w-4 mr-1" data-testid="home-icon" />
            )}
            Courses
          </Link>
        </li>

        <SeparatorElement />

        {/* Course Name Link */}
        <li className="flex items-center">
          {isLoading ? (
            <Skeleton className="h-4 w-32" data-testid="breadcrumb-skeleton" />
          ) : (
            <Link
              href={`/courses/${courseId}`}
              className={cn(
                'text-slate-600 hover:text-slate-900 transition-colors cursor-pointer',
                compact && 'max-w-[200px] truncate'
              )}
              title={displayCourseName}
            >
              {displayCourseName}
            </Link>
          )}
        </li>

        <SeparatorElement />

        {/* Files (Current Page) */}
        <li className="flex items-center">
          <span
            aria-current="page"
            className="font-medium text-slate-900"
          >
            Files
          </span>
        </li>
      </ol>
    </nav>
  )
}

export { FilesBreadcrumb }
