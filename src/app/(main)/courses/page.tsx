/**
 * Courses Page
 * Main page for viewing and managing courses
 */

'use client'

import { useCourses } from '@/hooks/use-courses'
import { CreateCourseDialog, CourseGrid } from '@/components/course'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function CoursesPage() {
  const { data: courses, isLoading, error } = useCourses()

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your learning materials by course
          </p>
        </div>
        <CreateCourseDialog />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load courses. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : courses ? (
        <CourseGrid courses={courses} />
      ) : null}
    </div>
  )
}
