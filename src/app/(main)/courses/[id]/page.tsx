/**
 * Course Detail Page
 * Displays course information
 */

'use client'

import { useCourse } from '@/hooks/use-courses'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, GraduationCap, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CourseDetailPageProps {
  params: {
    id: string
  }
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = params
  const router = useRouter()
  const { data: course, isLoading, error } = useCourse(id)

  if (isLoading) {
    return (
      <div
        className="container mx-auto max-w-7xl px-4 py-8"
        data-testid="course-detail-loading"
      >
        <Skeleton className="mb-4 h-10 w-32" />
        <Skeleton className="mb-8 h-12 w-96" />
        <div className="space-y-4">
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/courses')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load course. The course may not exist or you don&apos;t
            have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.push('/courses')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
        <div className="mt-4 flex flex-wrap gap-4">
          {course.school && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-5 w-5" />
              <span>{course.school}</span>
            </div>
          )}
          {course.term && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span>{course.term}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-muted-foreground">
          Course details and file management features are being updated. Please
          check back later.
        </p>
      </div>
    </div>
  )
}
