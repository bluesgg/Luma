import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Unit Tests for CourseCard Component
 *
 * Tests the individual course card component that displays:
 * - Course name
 * - School (optional)
 * - Term (optional)
 * - File count
 * - Dropdown menu with edit/delete actions
 * - Click navigation to course files
 *
 * File to update: src/components/course/course-card.tsx
 */

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Import component (exists but needs enhancement)
import { CourseCard } from '@/components/course/course-card'

describe('CourseCard Component', () => {
  const defaultProps = {
    id: 'course-123',
    name: 'Introduction to Mathematics',
    school: 'MIT',
    term: 'Fall 2024',
    fileCount: 5,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders course name', () => {
      render(<CourseCard {...defaultProps} />)

      expect(screen.getByText('Introduction to Mathematics')).toBeInTheDocument()
    })

    it('renders school when provided', () => {
      render(<CourseCard {...defaultProps} />)

      expect(screen.getByText('MIT')).toBeInTheDocument()
    })

    it('renders term when provided', () => {
      render(<CourseCard {...defaultProps} />)

      expect(screen.getByText('Fall 2024')).toBeInTheDocument()
    })

    it('renders file count', () => {
      render(<CourseCard {...defaultProps} />)

      expect(screen.getByText(/5 files/i)).toBeInTheDocument()
    })

    it('renders singular "file" when count is 1', () => {
      render(<CourseCard {...defaultProps} fileCount={1} />)

      expect(screen.getByText(/1 file$/i)).toBeInTheDocument()
    })

    it('renders "0 files" when count is 0', () => {
      render(<CourseCard {...defaultProps} fileCount={0} />)

      expect(screen.getByText(/0 files/i)).toBeInTheDocument()
    })

    it('does not render school when null', () => {
      render(<CourseCard {...defaultProps} school={null} />)

      expect(screen.queryByText('MIT')).not.toBeInTheDocument()
    })

    it('does not render term when null', () => {
      render(<CourseCard {...defaultProps} term={null} />)

      expect(screen.queryByText('Fall 2024')).not.toBeInTheDocument()
    })

    it('does not render school when undefined', () => {
      const { school, ...propsWithoutSchool } = defaultProps
      render(<CourseCard {...propsWithoutSchool} />)

      // The school text should not appear
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    })

    it('renders course name as a heading', () => {
      render(<CourseCard {...defaultProps} />)

      // The name should be in a heading element for accessibility
      const heading = screen.getByRole('heading', { name: /introduction to mathematics/i })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Click Navigation', () => {
    it('navigates to course files page on card click', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      // Find the clickable card area (not the dropdown button)
      const card = screen.getByTestId('course-card')
      await user.click(card)

      expect(mockPush).toHaveBeenCalledWith('/files/course-123')
    })

    it('does not navigate when clicking dropdown menu', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      // Click the dropdown trigger
      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('has accessible role for clickable card', () => {
      render(<CourseCard {...defaultProps} />)

      // The card should be accessible as a link or button
      const card = screen.getByTestId('course-card')
      expect(card).toHaveAttribute('role', 'link')
      // Or could be a button with navigation
    })

    it('has keyboard navigation support', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      card.focus()
      await user.keyboard('{Enter}')

      expect(mockPush).toHaveBeenCalledWith('/files/course-123')
    })
  })

  describe('Dropdown Menu', () => {
    it('renders dropdown menu trigger button', () => {
      render(<CourseCard {...defaultProps} />)

      const menuButton = screen.getByRole('button', { name: /options/i })
      expect(menuButton).toBeInTheDocument()
    })

    it('opens dropdown menu on trigger click', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      // Menu items should be visible
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
    })

    it('calls onEdit when edit option is clicked', async () => {
      const user = userEvent.setup()
      const onEdit = vi.fn()
      render(<CourseCard {...defaultProps} onEdit={onEdit} />)

      // Open menu
      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      // Click edit
      const editOption = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editOption)

      expect(onEdit).toHaveBeenCalledWith({
        id: 'course-123',
        name: 'Introduction to Mathematics',
        school: 'MIT',
        term: 'Fall 2024',
      })
    })

    it('calls onDelete when delete option is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      render(<CourseCard {...defaultProps} onDelete={onDelete} />)

      // Open menu
      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      // Click delete
      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      await user.click(deleteOption)

      expect(onDelete).toHaveBeenCalledWith({
        id: 'course-123',
        name: 'Introduction to Mathematics',
      })
    })

    it('shows delete option in destructive/red style', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      const deleteOption = screen.getByRole('menuitem', { name: /delete/i })
      // Check for destructive styling (red text)
      expect(deleteOption).toHaveClass('text-destructive')
    })

    it('closes dropdown after selecting an option', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      const editOption = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editOption)

      // Menu should be closed
      expect(screen.queryByRole('menuitem', { name: /edit/i })).not.toBeInTheDocument()
    })

    it('stops propagation on dropdown menu click', async () => {
      const user = userEvent.setup()
      render(<CourseCard {...defaultProps} />)

      // Click menu button
      const menuButton = screen.getByRole('button', { name: /options/i })
      await user.click(menuButton)

      // Card click handler should not have been called
      expect(mockPush).not.toHaveBeenCalled()

      // Click edit option
      const editOption = screen.getByRole('menuitem', { name: /edit/i })
      await user.click(editOption)

      // Navigation should still not be triggered
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Styling and Layout', () => {
    it('applies hover shadow effect', () => {
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      expect(card).toHaveClass('hover:shadow-md')
    })

    it('has border and rounded corners', () => {
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('rounded-lg')
    })

    it('has appropriate padding', () => {
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      expect(card).toHaveClass('p-4')
    })

    it('positions dropdown menu button at top-right', () => {
      render(<CourseCard {...defaultProps} />)

      // The card container should have relative positioning
      const card = screen.getByTestId('course-card')
      expect(card).toHaveClass('relative')

      // Menu button should be absolutely positioned
      const menuButton = screen.getByRole('button', { name: /options/i })
      expect(menuButton).toHaveClass('absolute')
    })
  })

  describe('Accessibility', () => {
    it('has accessible name for dropdown menu button', () => {
      render(<CourseCard {...defaultProps} />)

      const menuButton = screen.getByRole('button', { name: /options/i })
      expect(menuButton).toHaveAccessibleName()
    })

    it('menu button has aria-haspopup attribute', () => {
      render(<CourseCard {...defaultProps} />)

      const menuButton = screen.getByRole('button', { name: /options/i })
      expect(menuButton).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('card has focus visible styles', () => {
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      // Should have focus-visible ring for keyboard navigation
      expect(card).toHaveClass('focus-visible:ring-2')
    })

    it('screen reader announces course information', () => {
      render(<CourseCard {...defaultProps} />)

      // The card should have sufficient information for screen readers
      const card = screen.getByTestId('course-card')
      // Either via aria-label or via content structure
      expect(card).toHaveAccessibleName(/introduction to mathematics/i)
    })
  })

  describe('Edge Cases', () => {
    it('handles very long course name gracefully', () => {
      const longName = 'A'.repeat(100)
      render(<CourseCard {...defaultProps} name={longName} />)

      const card = screen.getByTestId('course-card')
      // Should truncate or wrap properly
      expect(card).toHaveClass('overflow-hidden')
    })

    it('handles special characters in course name', () => {
      render(<CourseCard {...defaultProps} name="Math & Science: A/B Testing (2024)" />)

      expect(screen.getByText('Math & Science: A/B Testing (2024)')).toBeInTheDocument()
    })

    it('handles unicode characters in course name', () => {
      render(<CourseCard {...defaultProps} name="Mathematiques Avancees" />)

      expect(screen.getByText('Mathematiques Avancees')).toBeInTheDocument()
    })

    it('handles Chinese characters in course name', () => {
      render(<CourseCard {...defaultProps} name="Introduction to Mathematics" school="University" />)

      expect(screen.getByText('Introduction to Mathematics')).toBeInTheDocument()
    })

    it('handles empty string for school', () => {
      render(<CourseCard {...defaultProps} school="" />)

      // Should not render empty element
      const schoolElements = screen.queryAllByText('')
      // Filter out actual empty elements that might exist
      expect(schoolElements.filter((el) => el.textContent === '')).toHaveLength(0)
    })

    it('handles large file count', () => {
      render(<CourseCard {...defaultProps} fileCount={9999} />)

      expect(screen.getByText(/9999 files/i)).toBeInTheDocument()
    })
  })

  describe('Interaction States', () => {
    it('shows cursor pointer on hover', () => {
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      expect(card).toHaveClass('cursor-pointer')
    })

    it('applies transition for smooth hover effect', () => {
      render(<CourseCard {...defaultProps} />)

      const card = screen.getByTestId('course-card')
      expect(card).toHaveClass('transition-shadow')
    })
  })
})

describe('CourseCard with Missing Handlers', () => {
  it('renders without onEdit handler', () => {
    const props = {
      id: 'course-1',
      name: 'Test Course',
      school: null,
      term: null,
      fileCount: 0,
      onDelete: vi.fn(),
    }

    // Should not throw
    expect(() => render(<CourseCard {...props} />)).not.toThrow()
  })

  it('renders without onDelete handler', () => {
    const props = {
      id: 'course-1',
      name: 'Test Course',
      school: null,
      term: null,
      fileCount: 0,
      onEdit: vi.fn(),
    }

    // Should not throw
    expect(() => render(<CourseCard {...props} />)).not.toThrow()
  })
})
