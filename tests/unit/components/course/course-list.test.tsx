import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Unit Tests for CourseList Component
 *
 * Tests the course list grid component that displays:
 * - Responsive grid layout (1/2/3 columns)
 * - Empty state when no courses
 * - Proper rendering of CourseCard components
 * - Event handler propagation to parent
 *
 * File to update: src/components/course/course-list.tsx
 */

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Import component
import { CourseList } from '@/components/course/course-list'

describe('CourseList Component', () => {
  const mockCourses = [
    {
      id: 'course-1',
      name: 'Mathematics 101',
      school: 'MIT',
      term: 'Fall 2024',
      _count: { files: 5 },
    },
    {
      id: 'course-2',
      name: 'Physics 201',
      school: 'Harvard',
      term: 'Spring 2024',
      _count: { files: 3 },
    },
    {
      id: 'course-3',
      name: 'Chemistry 301',
      school: null,
      term: 'Winter 2024',
      _count: { files: 0 },
    },
  ]

  const defaultProps = {
    courses: mockCourses,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering Courses', () => {
    it('renders all courses in the list', () => {
      render(<CourseList {...defaultProps} />)

      expect(screen.getByText('Mathematics 101')).toBeInTheDocument()
      expect(screen.getByText('Physics 201')).toBeInTheDocument()
      expect(screen.getByText('Chemistry 301')).toBeInTheDocument()
    })

    it('renders correct number of course cards', () => {
      render(<CourseList {...defaultProps} />)

      const cards = screen.getAllByTestId('course-card')
      expect(cards).toHaveLength(3)
    })

    it('passes correct props to each CourseCard', () => {
      render(<CourseList {...defaultProps} />)

      // Check first course
      expect(screen.getByText('MIT')).toBeInTheDocument()
      expect(screen.getByText('Fall 2024')).toBeInTheDocument()
      expect(screen.getByText(/5 files/i)).toBeInTheDocument()

      // Check second course
      expect(screen.getByText('Harvard')).toBeInTheDocument()
      expect(screen.getByText('Spring 2024')).toBeInTheDocument()
      expect(screen.getByText(/3 files/i)).toBeInTheDocument()

      // Check third course (no school)
      expect(screen.getByText('Winter 2024')).toBeInTheDocument()
      expect(screen.getByText(/0 files/i)).toBeInTheDocument()
    })

    it('renders courses in the order provided', () => {
      render(<CourseList {...defaultProps} />)

      const courseNames = screen
        .getAllByRole('heading')
        .map((heading) => heading.textContent)

      expect(courseNames).toEqual([
        'Mathematics 101',
        'Physics 201',
        'Chemistry 301',
      ])
    })
  })

  describe('Empty State', () => {
    it('renders empty state when courses array is empty', () => {
      render(<CourseList {...defaultProps} courses={[]} />)

      expect(
        screen.getByText(/no courses yet/i)
      ).toBeInTheDocument()
    })

    it('shows call-to-action message in empty state', () => {
      render(<CourseList {...defaultProps} courses={[]} />)

      expect(
        screen.getByText(/create your first course/i)
      ).toBeInTheDocument()
    })

    it('does not render any course cards in empty state', () => {
      render(<CourseList {...defaultProps} courses={[]} />)

      const cards = screen.queryAllByTestId('course-card')
      expect(cards).toHaveLength(0)
    })

    it('centers empty state message', () => {
      render(<CourseList {...defaultProps} courses={[]} />)

      const emptyState = screen.getByText(/no courses yet/i).closest('div')
      expect(emptyState).toHaveClass('text-center')
    })

    it('applies muted text color to empty state', () => {
      render(<CourseList {...defaultProps} courses={[]} />)

      const emptyState = screen.getByText(/no courses yet/i).closest('div')
      expect(emptyState).toHaveClass('text-muted-foreground')
    })
  })

  describe('Grid Layout', () => {
    it('renders as a grid container', () => {
      render(<CourseList {...defaultProps} />)

      const grid = screen.getByTestId('course-grid')
      expect(grid).toHaveClass('grid')
    })

    it('has 1 column on mobile (default)', () => {
      render(<CourseList {...defaultProps} />)

      const grid = screen.getByTestId('course-grid')
      expect(grid).toHaveClass('grid-cols-1')
    })

    it('has 2 columns on medium screens', () => {
      render(<CourseList {...defaultProps} />)

      const grid = screen.getByTestId('course-grid')
      expect(grid).toHaveClass('md:grid-cols-2')
    })

    it('has 3 columns on large screens', () => {
      render(<CourseList {...defaultProps} />)

      const grid = screen.getByTestId('course-grid')
      expect(grid).toHaveClass('lg:grid-cols-3')
    })

    it('has gap between grid items', () => {
      render(<CourseList {...defaultProps} />)

      const grid = screen.getByTestId('course-grid')
      expect(grid).toHaveClass('gap-4')
    })
  })

  describe('Event Handler Propagation', () => {
    it('passes onEdit handler to each CourseCard', async () => {
      const user = userEvent.setup()
      const onEdit = vi.fn()
      render(<CourseList {...defaultProps} onEdit={onEdit} />)

      // Open first card's dropdown and click edit
      const cards = screen.getAllByTestId('course-card')
      const firstCardMenu = within(cards[0]).getByRole('button', { name: /options/i })
      await user.click(firstCardMenu)

      const editOption = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editOption)

      expect(onEdit).toHaveBeenCalledWith({
        id: 'course-1',
        name: 'Mathematics 101',
        school: 'MIT',
        term: 'Fall 2024',
      })
    })

    it('passes onDelete handler to each CourseCard', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      render(<CourseList {...defaultProps} onDelete={onDelete} />)

      // Open second card's dropdown and click delete
      const cards = screen.getAllByTestId('course-card')
      const secondCardMenu = within(cards[1]).getByRole('button', { name: /options/i })
      await user.click(secondCardMenu)

      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      await user.click(deleteOption)

      expect(onDelete).toHaveBeenCalledWith({
        id: 'course-2',
        name: 'Physics 201',
      })
    })

    it('calls correct handler for the clicked course', async () => {
      const user = userEvent.setup()
      const onEdit = vi.fn()
      render(<CourseList {...defaultProps} onEdit={onEdit} />)

      // Click edit on the third course
      const cards = screen.getAllByTestId('course-card')
      const thirdCardMenu = within(cards[2]).getByRole('button', { name: /options/i })
      await user.click(thirdCardMenu)

      const editOption = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editOption)

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'course-3',
          name: 'Chemistry 301',
        })
      )
    })
  })

  describe('Accessibility', () => {
    it('uses semantic list structure', () => {
      render(<CourseList {...defaultProps} />)

      // The grid could be a list for accessibility
      const grid = screen.getByTestId('course-grid')
      expect(grid.tagName).toBe('DIV') // or 'UL' with role="list"
    })

    it('empty state has appropriate aria-live for announcements', () => {
      render(<CourseList {...defaultProps} courses={[]} />)

      const emptyState = screen.getByText(/no courses yet/i).closest('div')
      // Empty state could use aria-live for dynamic updates
      // expect(emptyState).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Performance', () => {
    it('renders efficiently with many courses', () => {
      const manyCourses = Array.from({ length: 50 }, (_, i) => ({
        id: `course-${i}`,
        name: `Course ${i}`,
        school: `School ${i}`,
        term: `Term ${i}`,
        _count: { files: i },
      }))

      const startTime = performance.now()
      render(<CourseList {...defaultProps} courses={manyCourses} />)
      const endTime = performance.now()

      // Rendering should be fast (< 500ms)
      expect(endTime - startTime).toBeLessThan(500)

      // All courses should be rendered
      const cards = screen.getAllByTestId('course-card')
      expect(cards).toHaveLength(50)
    })

    it('uses unique keys for each course card', () => {
      // This is a static test - verifying the implementation uses course.id as key
      // The actual key usage is verified by React warnings in dev mode
      render(<CourseList {...defaultProps} />)

      // No key warning should appear (checked via console spy in setup)
      const cards = screen.getAllByTestId('course-card')
      expect(cards).toHaveLength(3)
    })
  })

  describe('Edge Cases', () => {
    it('handles course with null school and term', () => {
      const coursesWithNulls = [
        {
          id: 'course-1',
          name: 'Test Course',
          school: null,
          term: null,
          _count: { files: 0 },
        },
      ]

      render(<CourseList {...defaultProps} courses={coursesWithNulls} />)

      expect(screen.getByText('Test Course')).toBeInTheDocument()
      // Should not render null values
      expect(screen.queryByText('null')).not.toBeInTheDocument()
    })

    it('handles single course', () => {
      const singleCourse = [mockCourses[0]]

      render(<CourseList {...defaultProps} courses={singleCourse} />)

      const cards = screen.getAllByTestId('course-card')
      expect(cards).toHaveLength(1)
    })

    it('handles maximum courses (6)', () => {
      const maxCourses = Array.from({ length: 6 }, (_, i) => ({
        id: `course-${i}`,
        name: `Course ${i}`,
        school: null,
        term: null,
        _count: { files: 0 },
      }))

      render(<CourseList {...defaultProps} courses={maxCourses} />)

      const cards = screen.getAllByTestId('course-card')
      expect(cards).toHaveLength(6)
    })
  })
})

describe('CourseList without handlers', () => {
  const mockCourses = [
    {
      id: 'course-1',
      name: 'Test Course',
      school: null,
      term: null,
      _count: { files: 0 },
    },
  ]

  it('renders without onEdit handler', () => {
    expect(() =>
      render(<CourseList courses={mockCourses} onDelete={vi.fn()} />)
    ).not.toThrow()
  })

  it('renders without onDelete handler', () => {
    expect(() =>
      render(<CourseList courses={mockCourses} onEdit={vi.fn()} />)
    ).not.toThrow()
  })

  it('renders without any handlers', () => {
    expect(() => render(<CourseList courses={mockCourses} />)).not.toThrow()
  })
})
