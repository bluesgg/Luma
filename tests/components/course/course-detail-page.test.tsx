/**
 * Course Detail Page Tests
 * Tests for course detail page component
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CourseDetailPage from '@/app/(main)/courses/[id]/page'
import * as useCourseHook from '@/hooks/use-courses'
import { useRouter } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock the useCourse hook
vi.mock('@/hooks/use-courses', () => ({
  useCourse: vi.fn(),
}))

describe('CourseDetailPage', () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue(mockRouter)
  })

  it('should handle params correctly without use() hook', () => {
    // Mock the hook to return loading state
    vi.spyOn(useCourseHook, 'useCourse').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as any)

    // Test that params is accessed directly (not as a Promise)
    const params = { id: 'test-course-123' }

    // This should NOT throw an error
    expect(() => {
      render(<CourseDetailPage params={params} />)
    }).not.toThrow()

    // Should show loading skeleton
    expect(screen.getByTestId('course-detail-loading')).toBeInTheDocument()
  })

  it('should render course details when data is loaded', async () => {
    const mockCourse = {
      id: 'course-123',
      name: 'Introduction to Computer Science',
      school: 'MIT',
      term: 'Fall 2024',
      userId: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      files: [
        {
          id: 'file-1',
          name: 'Lecture 1.pdf',
          type: 'application/pdf',
          pageCount: 20,
          createdAt: new Date('2024-01-15'),
          fileSize: BigInt(1024000),
          courseId: 'course-123',
          userId: 'user-1',
          isScanned: true,
          status: 'COMPLETED',
          structureStatus: 'COMPLETED',
          structureError: null,
          storagePath: '/files/file-1.pdf',
          updatedAt: new Date('2024-01-15'),
          extractedAt: null,
        },
      ],
      _count: {
        files: 1,
      },
    }

    vi.spyOn(useCourseHook, 'useCourse').mockReturnValue({
      data: mockCourse,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as any)

    const params = { id: 'course-123' }

    render(<CourseDetailPage params={params} />)

    await waitFor(() => {
      expect(
        screen.getByText('Introduction to Computer Science')
      ).toBeInTheDocument()
    })

    expect(screen.getByText('MIT')).toBeInTheDocument()
    expect(screen.getByText('Fall 2024')).toBeInTheDocument()
    expect(screen.getByText('1 file')).toBeInTheDocument()
    expect(screen.getByText('Lecture 1.pdf')).toBeInTheDocument()
  })

  it('should show error state when course fails to load', () => {
    vi.spyOn(useCourseHook, 'useCourse').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Course not found'),
      isError: true,
      refetch: vi.fn(),
    } as any)

    const params = { id: 'invalid-course' }

    render(<CourseDetailPage params={params} />)

    expect(screen.getByText(/Failed to load course/i)).toBeInTheDocument()
    expect(screen.getByText('Back to Courses')).toBeInTheDocument()
  })

  it('should navigate back to courses when back button is clicked', () => {
    vi.spyOn(useCourseHook, 'useCourse').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
      isError: true,
      refetch: vi.fn(),
    } as any)

    const params = { id: 'test-id' }

    render(<CourseDetailPage params={params} />)

    const backButton = screen.getByText('Back to Courses')
    backButton.click()

    expect(mockRouter.push).toHaveBeenCalledWith('/courses')
  })

  it('should show empty state when course has no files', async () => {
    const mockCourse = {
      id: 'course-empty',
      name: 'Empty Course',
      school: null,
      term: null,
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      _count: {
        files: 0,
      },
    }

    vi.spyOn(useCourseHook, 'useCourse').mockReturnValue({
      data: mockCourse,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as any)

    const params = { id: 'course-empty' }

    render(<CourseDetailPage params={params} />)

    await waitFor(() => {
      expect(screen.getByText('No files yet')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Upload files to start organizing your course materials')
    ).toBeInTheDocument()
  })
})
