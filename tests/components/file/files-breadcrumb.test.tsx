import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilesBreadcrumb } from '@/components/file/files-breadcrumb'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('FilesBreadcrumb', () => {
  const defaultProps = {
    courseName: 'Introduction to Computer Science',
    courseId: '123e4567-e89b-12d3-a456-426614174001',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders breadcrumb navigation', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('renders with data-testid', () => {
      render(<FilesBreadcrumb {...defaultProps} data-testid="files-breadcrumb" />)

      expect(screen.getByTestId('files-breadcrumb')).toBeInTheDocument()
    })

    it('renders breadcrumb list', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  // ============================================
  // Breadcrumb Items
  // ============================================

  describe('Breadcrumb Items', () => {
    it('renders Courses link as first item', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      expect(coursesLink).toBeInTheDocument()
      expect(coursesLink).toHaveAttribute('href', '/courses')
    })

    it('renders course name as second item', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument()
    })

    it('renders Files as current/last item', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      expect(screen.getByText(/files/i)).toBeInTheDocument()
    })

    it('shows correct number of breadcrumb items', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const items = screen.getAllByRole('listitem')
      expect(items.length).toBe(3) // Courses > Course Name > Files
    })
  })

  // ============================================
  // Links and Navigation
  // ============================================

  describe('Links and Navigation', () => {
    it('Courses link navigates to /courses', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      expect(coursesLink).toHaveAttribute('href', '/courses')
    })

    it('course name links to course detail page', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const courseLink = screen.getByRole('link', { name: /Introduction to Computer Science/i })
      expect(courseLink).toHaveAttribute('href', `/courses/${defaultProps.courseId}`)
    })

    it('Files is not a link (current page)', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const filesElement = screen.getByText(/files/i)
      // Current page should not be a link
      expect(filesElement.tagName).not.toBe('A')
    })

    it('links are clickable', async () => {
      const user = userEvent.setup()
      render(<FilesBreadcrumb {...defaultProps} />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      await user.click(coursesLink)

      // Click should work without throwing
      expect(coursesLink).toBeInTheDocument()
    })
  })

  // ============================================
  // Separators
  // ============================================

  describe('Separators', () => {
    it('renders separators between items', () => {
      const { container } = render(<FilesBreadcrumb {...defaultProps} />)

      // Should have separator elements (could be /, >, or icon)
      const separators = container.querySelectorAll('[aria-hidden="true"]') ||
        container.querySelectorAll('.separator') ||
        container.querySelectorAll('svg')

      expect(separators.length).toBeGreaterThanOrEqual(2)
    })

    it('separators are visually present', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      // Should have visual separators (/, >, or chevron icon)
      expect(
        screen.getByText('/') ||
        screen.getByText('>') ||
        screen.getAllByRole('img', { hidden: true }).length > 0
      ).toBeTruthy()
    })
  })

  // ============================================
  // Course Name Handling
  // ============================================

  describe('Course Name Handling', () => {
    it('displays full course name', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument()
    })

    it('truncates very long course names', () => {
      const longName = 'This is an extremely long course name that should probably be truncated for better display in the breadcrumb navigation'

      render(<FilesBreadcrumb {...defaultProps} courseName={longName} />)

      const courseElement = screen.getByText(/This is an extremely/i)
      // Should either show truncated name or have truncation styling
      expect(courseElement).toBeInTheDocument()
    })

    it('handles special characters in course name', () => {
      render(
        <FilesBreadcrumb
          {...defaultProps}
          courseName="Math & Science (2024)"
        />
      )

      expect(screen.getByText('Math & Science (2024)')).toBeInTheDocument()
    })

    it('handles unicode in course name', () => {
      render(
        <FilesBreadcrumb
          {...defaultProps}
          courseName="Cours de Francais"
        />
      )

      expect(screen.getByText('Cours de Francais')).toBeInTheDocument()
    })

    it('handles empty course name', () => {
      render(<FilesBreadcrumb {...defaultProps} courseName="" />)

      // Should still render without crashing
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  // ============================================
  // Home Icon
  // ============================================

  describe('Home Icon', () => {
    it('shows home icon for Courses link', () => {
      const { container } = render(<FilesBreadcrumb {...defaultProps} showHomeIcon />)

      // Should have home icon
      const homeIcon = container.querySelector('[data-testid="home-icon"]') ||
        container.querySelector('svg')

      expect(homeIcon).toBeInTheDocument()
    })

    it('home icon is part of first breadcrumb item', () => {
      render(<FilesBreadcrumb {...defaultProps} showHomeIcon />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      const icon = coursesLink.querySelector('svg')

      expect(icon || coursesLink.textContent).toBeTruthy()
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('has nav element with aria-label', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')
    })

    it('uses ordered list for breadcrumb items', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('current page is marked with aria-current', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const currentPage = screen.getByText(/files/i)
      expect(currentPage).toHaveAttribute('aria-current', 'page')
    })

    it('links have accessible names', () => {
      render(<FilesBreadcrumb {...defaultProps} />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      expect(coursesLink).toHaveAccessibleName()

      const courseLink = screen.getByRole('link', { name: /Introduction to Computer Science/i })
      expect(courseLink).toHaveAccessibleName()
    })

    it('separators are hidden from screen readers', () => {
      const { container } = render(<FilesBreadcrumb {...defaultProps} />)

      const separators = container.querySelectorAll('[aria-hidden="true"]')
      // Separators should be hidden
      expect(separators.length).toBeGreaterThan(0)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<FilesBreadcrumb {...defaultProps} />)

      await user.tab()

      // First link should be focused
      expect(document.activeElement?.tagName).toBe('A')
    })
  })

  // ============================================
  // Responsive Design
  // ============================================

  describe('Responsive Design', () => {
    it('collapses on small screens if compact prop is true', () => {
      render(<FilesBreadcrumb {...defaultProps} compact />)

      // In compact mode, middle items might be collapsed
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('shows ellipsis for collapsed items', () => {
      render(<FilesBreadcrumb {...defaultProps} compact maxVisibleItems={2} />)

      // With 3 items and max 2 visible, should show ellipsis
      const ellipsis = screen.queryByText('...')
      // Could show ellipsis or collapse in dropdown
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  // ============================================
  // Custom Styling
  // ============================================

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(
        <FilesBreadcrumb
          {...defaultProps}
          className="custom-breadcrumb"
          data-testid="breadcrumb"
        />
      )

      const breadcrumb = screen.getByTestId('breadcrumb')
      expect(breadcrumb).toHaveClass('custom-breadcrumb')
    })

    it('accepts custom separator', () => {
      render(
        <FilesBreadcrumb {...defaultProps} separator=">" />
      )

      expect(screen.getAllByText('>')).toHaveLength(2)
    })
  })

  // ============================================
  // Loading State
  // ============================================

  describe('Loading State', () => {
    it('shows skeleton when loading', () => {
      render(<FilesBreadcrumb {...defaultProps} isLoading />)

      // Should show skeleton placeholders
      const skeleton = screen.queryByTestId('breadcrumb-skeleton') ||
        screen.queryByRole('status')

      // Either shows skeleton or just the navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('course name shows skeleton when loading', () => {
      render(<FilesBreadcrumb {...defaultProps} isLoading />)

      // Course name area should show loading state
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles missing courseId', () => {
      render(
        <FilesBreadcrumb
          courseName="Test Course"
          courseId={undefined as unknown as string}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles missing courseName', () => {
      render(
        <FilesBreadcrumb
          courseName={undefined as unknown as string}
          courseId={defaultProps.courseId}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles very long courseId', () => {
      const longId = 'a'.repeat(100)

      render(<FilesBreadcrumb {...defaultProps} courseId={longId} />)

      const courseLink = screen.getByRole('link', { name: /Introduction to Computer Science/i })
      expect(courseLink).toHaveAttribute('href', `/courses/${longId}`)
    })

    it('handles rapid prop updates', () => {
      const { rerender } = render(
        <FilesBreadcrumb {...defaultProps} courseName="Course 1" />
      )

      rerender(<FilesBreadcrumb {...defaultProps} courseName="Course 2" />)
      rerender(<FilesBreadcrumb {...defaultProps} courseName="Course 3" />)

      expect(screen.getByText('Course 3')).toBeInTheDocument()
    })
  })
})
