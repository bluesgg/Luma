import type { ApiSuccessResponse, ApiErrorResponse } from '@/types'

export interface CreateCourseInput {
  name: string
  school?: string
  term?: string
}

export interface UpdateCourseInput {
  name?: string
  school?: string | null
  term?: string | null
}

export type CourseResponse = {
  id: string
  userId: string
  name: string
  school: string | null
  term: string | null
  createdAt: string
  updatedAt: string
  _count: { files: number }
}

async function parseErrorResponse(response: Response): Promise<Error> {
  try {
    const error = (await response.json()) as ApiErrorResponse
    return new Error(error.error.message)
  } catch {
    return new Error(`Request failed with status ${response.status}`)
  }
}

export async function fetchCourses(): Promise<CourseResponse[]> {
  const response = await fetch('/api/courses', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data = (await response.json()) as ApiSuccessResponse<{ courses: CourseResponse[] }>
  return data.data.courses
}

export async function createCourse(
  input: CreateCourseInput,
  csrfHeaders: Record<string, string>
): Promise<CourseResponse> {
  const response = await fetch('/api/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data = (await response.json()) as ApiSuccessResponse<{ course: CourseResponse }>
  return data.data.course
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
  csrfHeaders: Record<string, string>
): Promise<CourseResponse> {
  const response = await fetch(`/api/courses/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
    },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  const data = (await response.json()) as ApiSuccessResponse<{ course: CourseResponse }>
  return data.data.course
}

export async function deleteCourse(
  id: string,
  csrfHeaders: Record<string, string>
): Promise<void> {
  const response = await fetch(`/api/courses/${id}`, {
    method: 'DELETE',
    headers: {
      ...csrfHeaders,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }
}
