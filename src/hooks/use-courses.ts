/**
 * Course Management Hooks
 * React Query hooks for course CRUD operations (CRS-009)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  type UpdateCourseData,
} from '@/lib/api/courses'
import { useToast } from './use-toast'
import { useRouter } from 'next/navigation'
import type { CourseWithFiles } from '@/types'

// Query keys
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: () => [...courseKeys.lists()] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
}

/**
 * Fetch all courses for authenticated user
 */
export function useCourses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: courseKeys.list(),
    queryFn: getCourses,
    ...options,
  })
}

/**
 * Fetch single course by ID
 */
export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: courseId ? courseKeys.detail(courseId) : ['courses', 'empty'],
    queryFn: () => {
      if (!courseId) {
        throw new Error('Course ID is required')
      }
      return getCourse(courseId)
    },
    enabled: !!courseId,
  })
}

/**
 * Create a new course
 */
export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: createCourse,
    onSuccess: (newCourse) => {
      // Invalidate and refetch courses list
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() })

      toast({
        title: 'Course created',
        description: `Successfully created "${newCourse.name}"`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create course',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update an existing course
 */
export function useUpdateCourse() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      courseId,
      data,
    }: {
      courseId: string
      data: UpdateCourseData
    }) => updateCourse(courseId, data),
    onMutate: async ({ courseId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: courseKeys.detail(courseId) })
      await queryClient.cancelQueries({ queryKey: courseKeys.lists() })

      // Snapshot previous value
      const previousCourse = queryClient.getQueryData<CourseWithFiles>(
        courseKeys.detail(courseId)
      )

      // Optimistically update detail
      if (previousCourse) {
        queryClient.setQueryData<CourseWithFiles>(courseKeys.detail(courseId), {
          ...previousCourse,
          ...data,
          updatedAt: new Date(),
        })
      }

      // Optimistically update list
      const previousList = queryClient.getQueryData<CourseWithFiles[]>(
        courseKeys.list()
      )
      if (previousList) {
        queryClient.setQueryData<CourseWithFiles[]>(
          courseKeys.list(),
          previousList.map((course) =>
            course.id === courseId
              ? { ...course, ...data, updatedAt: new Date() }
              : course
          )
        )
      }

      return { previousCourse, previousList }
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousCourse) {
        queryClient.setQueryData(
          courseKeys.detail(variables.courseId),
          context.previousCourse
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(courseKeys.list(), context.previousList)
      }

      toast({
        title: 'Failed to update course',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
    },
    onSuccess: (updatedCourse) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: courseKeys.detail(updatedCourse.id),
      })
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() })

      toast({
        title: 'Course updated',
        description: `Successfully updated "${updatedCourse.name}"`,
      })
    },
  })
}

/**
 * Delete a course
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const router = useRouter()

  return useMutation({
    mutationFn: ({ courseId }: { courseId: string }) => deleteCourse(courseId),
    onMutate: async ({ courseId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: courseKeys.lists() })

      // Snapshot previous value
      const previousList = queryClient.getQueryData<CourseWithFiles[]>(
        courseKeys.list()
      )

      // Optimistically remove from list
      if (previousList) {
        queryClient.setQueryData<CourseWithFiles[]>(
          courseKeys.list(),
          previousList.filter((course) => course.id !== courseId)
        )
      }

      return { previousList }
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(courseKeys.list(), context.previousList)
      }

      toast({
        title: 'Failed to delete course',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() })
      queryClient.removeQueries({
        queryKey: courseKeys.detail(variables.courseId),
      })

      toast({
        title: 'Course deleted',
        description: 'Course and all associated files have been deleted',
      })

      // Navigate to courses page
      router.push('/courses')
    },
  })
}
