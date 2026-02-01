/**
 * Course Grid Component
 * Displays courses in a responsive grid layout
 */

'use client'

import { CourseCard } from './course-card'
import type { CourseWithFiles } from '@/types'

interface CourseGridProps {
  courses: CourseWithFiles[]
}

export function CourseGrid({ courses }: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">
          No courses yet
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first course to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}
