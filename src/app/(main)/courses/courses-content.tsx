'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CourseList, CourseListSkeleton } from '@/components/course/course-list'
import { EmptyCourses } from '@/components/course/empty-courses'
import { CreateCourseDialog } from '@/components/course/create-course-dialog'
import { EditCourseDialog } from '@/components/course/edit-course-dialog'
import { DeleteCourseDialog } from '@/components/course/delete-course-dialog'
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/hooks/use-courses'
import { useToast } from '@/hooks/use-toast'
import { STORAGE } from '@/lib/constants'
import type { CourseListItem } from '@/types'

export function CoursesContent() {
  // Data fetching
  const { data: courses, isLoading, error, courseCount, canCreateCourse } = useCourses()

  // Mutations
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()

  // Toast
  const { toast } = useToast()

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseListItem | null>(null)

  // Handlers
  const handleCreateSubmit = async (data: { name: string; school?: string; term?: string }) => {
    try {
      await createCourse.mutateAsync(data)
      setIsCreateOpen(false)
      toast({
        title: 'Course created',
        description: `"${data.name}" has been created successfully.`,
      })
    } catch (error) {
      toast({
        title: 'Failed to create course',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleEditClick = (course: CourseListItem) => {
    setSelectedCourse(course)
    setIsEditOpen(true)
  }

  const handleEditSubmit = async (data: { name?: string; school?: string; term?: string }) => {
    if (!selectedCourse) return
    try {
      await updateCourse.mutateAsync({ id: selectedCourse.id, input: data })
      setIsEditOpen(false)
      setSelectedCourse(null)
      toast({
        title: 'Course updated',
        description: 'Your changes have been saved.',
      })
    } catch (error) {
      toast({
        title: 'Failed to update course',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClick = (course: CourseListItem) => {
    setSelectedCourse(course)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCourse) return
    try {
      await deleteCourse.mutateAsync(selectedCourse.id)
      setIsDeleteOpen(false)
      toast({
        title: 'Course deleted',
        description: `"${selectedCourse.name}" has been deleted.`,
      })
      setSelectedCourse(null)
    } catch (error) {
      toast({
        title: 'Failed to delete course',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12" data-testid="courses-error">
        <p className="text-red-600 mb-4">Failed to load courses</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="cursor-pointer"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div data-testid="courses-content">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-800">My Courses</h1>
          <p className="text-slate-600 mt-1" data-testid="course-count">
            {courseCount} of {STORAGE.MAX_COURSES_PER_USER} courses
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={!canCreateCourse || isLoading}
          className="cursor-pointer"
          title={!canCreateCourse ? 'Course limit reached' : undefined}
          data-testid="create-course-button"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <CourseListSkeleton />
      ) : courses && courses.length > 0 ? (
        <CourseList courses={courses} onEdit={handleEditClick} onDelete={handleDeleteClick} />
      ) : (
        <EmptyCourses onCreateClick={() => setIsCreateOpen(true)} />
      )}

      {/* Dialogs */}
      <CreateCourseDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateSubmit}
        isLoading={createCourse.isPending}
      />

      <EditCourseDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        course={selectedCourse}
        onSubmit={handleEditSubmit}
        isLoading={updateCourse.isPending}
      />

      <DeleteCourseDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        courseName={selectedCourse?.name ?? ''}
        fileCount={selectedCourse?._count?.files ?? 0}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteCourse.isPending}
      />
    </div>
  )
}
