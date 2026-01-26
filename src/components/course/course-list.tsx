'use client'

import { CourseCard } from './course-card'
import { CourseCardSkeleton } from './course-card-skeleton'

interface Course {
  id: string
  name: string
  school?: string | null
  term?: string | null
  _count: { files: number }
}

export interface CourseListProps {
  courses: Course[]
  onEdit?: (course: Course) => void
  onDelete?: (course: Course) => void
}

export function CourseList({ courses, onEdit, onDelete }: CourseListProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="course-list"
    >
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          id={course.id}
          name={course.name}
          school={course.school}
          term={course.term}
          fileCount={course._count.files}
          onEdit={onEdit ? () => onEdit(course) : undefined}
          onDelete={onDelete ? () => onDelete(course) : undefined}
        />
      ))}
    </div>
  )
}

export function CourseListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="course-list-skeleton"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  )
}
