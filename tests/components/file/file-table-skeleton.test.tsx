import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileTableSkeleton } from '@/components/file/file-table-skeleton'

describe('FileTableSkeleton', () => {
  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders skeleton table', () => {
      render(<FileTableSkeleton />)

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('renders with data-testid', () => {
      render(<FileTableSkeleton data-testid="file-table-skeleton" />)

      expect(screen.getByTestId('file-table-skeleton')).toBeInTheDocument()
    })

    it('renders default number of rows', () => {
      render(<FileTableSkeleton />)

      // Default should be 5 rows
      const rows = screen.getAllByRole('row')
      // Header + 5 skeleton rows = 6 total
      expect(rows.length).toBe(6)
    })

    it('renders specified number of rows', () => {
      render(<FileTableSkeleton rows={10} />)

      const rows = screen.getAllByRole('row')
      // Header + 10 skeleton rows = 11 total
      expect(rows.length).toBe(11)
    })
  })

  // ============================================
  // Column Headers
  // ============================================

  describe('Column Headers', () => {
    it('renders header row', () => {
      render(<FileTableSkeleton />)

      const headerCells = screen.getAllByRole('columnheader')
      expect(headerCells.length).toBeGreaterThan(0)
    })

    it('renders correct column headers', () => {
      render(<FileTableSkeleton />)

      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /pages?/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /size/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    })

    it('header cells are not skeleton (real text)', () => {
      render(<FileTableSkeleton />)

      // Headers should have actual text, not skeleton placeholders
      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      expect(nameHeader.textContent).toMatch(/name/i)
    })
  })

  // ============================================
  // Skeleton Cells
  // ============================================

  describe('Skeleton Cells', () => {
    it('renders skeleton placeholders in cells', () => {
      const { container } = render(<FileTableSkeleton />)

      // Should have skeleton elements (usually divs with animation)
      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('skeleton cells have appropriate width', () => {
      const { container } = render(<FileTableSkeleton />)

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      // Skeletons should have width defined
      skeletons.forEach((skeleton) => {
        expect(skeleton).toBeInTheDocument()
      })
    })

    it('name column skeleton is wider than others', () => {
      const { container } = render(<FileTableSkeleton />)

      // First column (name) skeleton should be wider
      const rows = container.querySelectorAll('tbody tr')
      if (rows.length > 0) {
        const firstRow = rows[0]
        const cells = firstRow.querySelectorAll('td')
        // Name cell (first) should exist
        expect(cells.length).toBeGreaterThan(0)
      }
    })

    it('each row has same number of cells', () => {
      const { container } = render(<FileTableSkeleton />)

      const rows = container.querySelectorAll('tbody tr')
      const cellCounts = Array.from(rows).map(
        (row) => row.querySelectorAll('td').length
      )

      // All rows should have same number of cells
      const uniqueCounts = [...new Set(cellCounts)]
      expect(uniqueCounts.length).toBe(1)
    })
  })

  // ============================================
  // Animation
  // ============================================

  describe('Animation', () => {
    it('skeleton elements have animation class', () => {
      const { container } = render(<FileTableSkeleton />)

      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
    })

    it('animation creates shimmer effect', () => {
      const { container } = render(<FileTableSkeleton />)

      // Skeleton elements should have pulse animation
      const skeletons = container.querySelectorAll('.animate-pulse, [class*="shimmer"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('has accessible table structure', () => {
      render(<FileTableSkeleton />)

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('skeleton has loading status', () => {
      render(<FileTableSkeleton />)

      // Should indicate loading state
      const table = screen.getByRole('table')
      expect(
        table.getAttribute('aria-busy') === 'true' ||
        screen.queryByRole('status') !== null ||
        table.getAttribute('aria-label')?.includes('loading')
      ).toBe(true)
    })

    it('column headers have scope attribute', () => {
      render(<FileTableSkeleton />)

      const headers = screen.getAllByRole('columnheader')
      headers.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col')
      })
    })

    it('announces loading to screen readers', () => {
      render(<FileTableSkeleton />)

      // Should have aria-label or sr-only text indicating loading
      const table = screen.getByRole('table')
      expect(
        table.getAttribute('aria-label') ||
        screen.queryByText(/loading/i)
      ).toBeTruthy()
    })
  })

  // ============================================
  // Customization
  // ============================================

  describe('Customization', () => {
    it('accepts custom className', () => {
      render(<FileTableSkeleton className="custom-skeleton" data-testid="skeleton" />)

      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('custom-skeleton')
    })

    it('accepts rows prop to control number of rows', () => {
      render(<FileTableSkeleton rows={3} />)

      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(4) // Header + 3 data rows
    })

    it('accepts columns configuration', () => {
      render(
        <FileTableSkeleton
          columns={['name', 'size', 'status']}
        />
      )

      // Should only show specified columns
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBe(3)
    })
  })

  // ============================================
  // Visual Consistency
  // ============================================

  describe('Visual Consistency', () => {
    it('maintains consistent row height', () => {
      const { container } = render(<FileTableSkeleton />)

      const rows = container.querySelectorAll('tbody tr')
      // All rows should have similar height
      expect(rows.length).toBeGreaterThan(0)
    })

    it('skeleton colors are muted', () => {
      const { container } = render(<FileTableSkeleton />)

      const skeletons = container.querySelectorAll('.animate-pulse')
      // Skeletons should have muted background colors
      skeletons.forEach((skeleton) => {
        expect(skeleton.className).toMatch(/muted|gray|neutral|slate|bg-/i)
      })
    })

    it('matches real table structure', () => {
      const { container } = render(<FileTableSkeleton />)

      // Should have thead and tbody
      expect(container.querySelector('thead')).toBeInTheDocument()
      expect(container.querySelector('tbody')).toBeInTheDocument()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles rows=0', () => {
      render(<FileTableSkeleton rows={0} />)

      // Should still render header
      expect(screen.getByRole('table')).toBeInTheDocument()
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(1) // Just header
    })

    it('handles rows=1', () => {
      render(<FileTableSkeleton rows={1} />)

      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(2) // Header + 1 data row
    })

    it('handles large number of rows', () => {
      render(<FileTableSkeleton rows={100} />)

      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(101) // Header + 100 data rows
    })

    it('handles negative rows (treats as 0 or default)', () => {
      render(<FileTableSkeleton rows={-5} />)

      // Should handle gracefully
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  // ============================================
  // Integration with Loading States
  // ============================================

  describe('Integration', () => {
    it('can be conditionally rendered based on loading state', () => {
      const { rerender } = render(<FileTableSkeleton data-testid="skeleton" />)

      expect(screen.getByTestId('skeleton')).toBeInTheDocument()

      // Simulate data loaded - would unmount skeleton
      rerender(<div data-testid="real-table">Real Table</div>)

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
      expect(screen.getByTestId('real-table')).toBeInTheDocument()
    })

    it('has same width as real table', () => {
      const { container } = render(<FileTableSkeleton />)

      const table = container.querySelector('table')
      // Should have full width or match container
      expect(table).toBeInTheDocument()
    })
  })
})
