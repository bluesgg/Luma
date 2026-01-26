'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCsrf } from './use-csrf'
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  type CourseResponse,
  type CreateCourseInput,
  type UpdateCourseInput,
} from '@/lib/api/courses'
import { STORAGE } from '@/lib/constants'

export const COURSES_QUERY_KEY = ['courses'] as const

export function useCourses() {
  const query = useQuery({
    queryKey: COURSES_QUERY_KEY,
    queryFn: fetchCourses,
  })

  return {
    ...query,
    courseCount: query.data?.length ?? 0,
    canCreateCourse: (query.data?.length ?? 0) < STORAGE.MAX_COURSES_PER_USER,
  }
}

const CSRF_HEADER_NAME = 'X-CSRF-Token'

function validateCsrfHeaders(headers: Record<string, string>): void {
  if (!headers[CSRF_HEADER_NAME]) {
    throw new Error('CSRF token not available. Please try again.')
  }
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  const { getHeaders } = useCsrf()

  return useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      const headers = getHeaders()
      validateCsrfHeaders(headers)
      return createCourse(input, headers)
    },
    onSuccess: (newCourse) => {
      queryClient.setQueryData<CourseResponse[]>(COURSES_QUERY_KEY, (old) =>
        old ? [newCourse, ...old] : [newCourse]
      )
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  const { getHeaders } = useCsrf()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCourseInput }) => {
      const headers = getHeaders()
      validateCsrfHeaders(headers)
      return updateCourse(id, input, headers)
    },
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData<CourseResponse[]>(COURSES_QUERY_KEY, (old) =>
        old?.map((course) =>
          course.id === updatedCourse.id ? updatedCourse : course
        )
      )
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  const { getHeaders } = useCsrf()

  return useMutation({
    mutationFn: async (id: string) => {
      const headers = getHeaders()
      validateCsrfHeaders(headers)
      return deleteCourse(id, headers)
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: COURSES_QUERY_KEY })

      // Snapshot the previous value
      const previousCourses = queryClient.getQueryData<CourseResponse[]>(COURSES_QUERY_KEY)

      // Optimistically update
      queryClient.setQueryData<CourseResponse[]>(COURSES_QUERY_KEY, (old) =>
        old?.filter((course) => course.id !== deletedId)
      )

      return { previousCourses }
    },
    onError: (_err, _deletedId, context) => {
      // Rollback on error
      if (context?.previousCourses) {
        queryClient.setQueryData(COURSES_QUERY_KEY, context.previousCourses)
      }
    },
  })
}
