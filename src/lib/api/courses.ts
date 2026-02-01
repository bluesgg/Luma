/**
 * Course API Client
 * Client-side functions for course management
 */

import { apiClient } from './client'
import type { Course, CourseWithFiles } from '@/types'
import type { z } from 'zod'
import type { createCourseSchema, updateCourseSchema } from '@/lib/validation'

export type CreateCourseData = z.infer<typeof createCourseSchema>
export type UpdateCourseData = z.infer<typeof updateCourseSchema>

/**
 * Get all courses for the authenticated user
 */
export async function getCourses(): Promise<CourseWithFiles[]> {
  const response = await apiClient.get<CourseWithFiles[]>('/api/courses')
  return response
}

/**
 * Get a single course by ID
 */
export async function getCourse(courseId: string): Promise<CourseWithFiles> {
  const response = await apiClient.get<CourseWithFiles>(
    `/api/courses/${courseId}`
  )
  return response
}

/**
 * Create a new course
 */
export async function createCourse(data: CreateCourseData): Promise<Course> {
  const response = await apiClient.post<Course>('/api/courses', data)
  return response
}

/**
 * Update an existing course
 */
export async function updateCourse(
  courseId: string,
  data: UpdateCourseData
): Promise<Course> {
  const response = await apiClient.patch<Course>(
    `/api/courses/${courseId}`,
    data
  )
  return response
}

/**
 * Delete a course (cascades to all related files and data)
 */
export async function deleteCourse(courseId: string): Promise<void> {
  await apiClient.delete(`/api/courses/${courseId}`)
}
