'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function CourseCardSkeleton() {
  return (
    <div
      className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
      data-testid="course-card-skeleton"
    >
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/3 mb-4" />
      <div className="pt-3 border-t border-slate-100">
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}
