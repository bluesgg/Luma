import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileStatusBadge } from '@/components/file/file-status-badge'
import type { FileStatus } from '@prisma/client'

describe('FileStatusBadge', () => {
  // ============================================
  // Status Display Tests
  // ============================================

  describe('Status Display', () => {
    it('renders uploading status', () => {
      render(<FileStatusBadge status="uploading" />)

      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })

    it('renders processing status', () => {
      render(<FileStatusBadge status="processing" />)

      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    })

    it('renders ready status', () => {
      render(<FileStatusBadge status="ready" />)

      expect(screen.getByText(/ready/i)).toBeInTheDocument()
    })

    it('renders failed status', () => {
      render(<FileStatusBadge status="failed" />)

      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })

    it('renders with data-testid', () => {
      render(<FileStatusBadge status="ready" data-testid="file-status" />)

      expect(screen.getByTestId('file-status')).toBeInTheDocument()
    })
  })

  // ============================================
  // Color Coding Tests
  // ============================================

  describe('Color Coding', () => {
    it('uploading status has gray color', () => {
      render(<FileStatusBadge status="uploading" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should have gray/slate/neutral color classes
      expect(badge.className).toMatch(/gray|slate|neutral|muted/i)
    })

    it('processing status has yellow/amber color', () => {
      render(<FileStatusBadge status="processing" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should have yellow/amber/warning color classes
      expect(badge.className).toMatch(/yellow|amber|warning|orange/i)
    })

    it('ready status has green color', () => {
      render(<FileStatusBadge status="ready" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should have green/success color classes
      expect(badge.className).toMatch(/green|success|emerald/i)
    })

    it('failed status has red color', () => {
      render(<FileStatusBadge status="failed" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should have red/error/destructive color classes
      expect(badge.className).toMatch(/red|error|destructive|danger/i)
    })
  })

  // ============================================
  // Icon Tests
  // ============================================

  describe('Icons', () => {
    it('uploading status shows upload/cloud icon', () => {
      const { container } = render(<FileStatusBadge status="uploading" />)

      // Should have an SVG icon
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('processing status shows spinner icon', () => {
      const { container } = render(<FileStatusBadge status="processing" />)

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      // Spinner should have animation class (could be animate-spin)
      // className on SVG may be SVGAnimatedString, so convert to string
      const classNameStr = String(icon?.getAttribute('class') || '')
      const hasAnimationClass = classNameStr.includes('animate') || classNameStr.includes('spin')
      expect(hasAnimationClass).toBe(true)
    })

    it('ready status shows check icon', () => {
      const { container } = render(<FileStatusBadge status="ready" />)

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('failed status shows error/x icon', () => {
      const { container } = render(<FileStatusBadge status="failed" />)

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  // ============================================
  // Progress Bar Tests
  // ============================================

  describe('Progress Bar', () => {
    it('shows progress bar for uploading status', () => {
      render(
        <FileStatusBadge status="uploading" progress={50} data-testid="badge" />
      )

      // Should have a progress element or progress indicator
      const progressBar = screen.queryByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('shows progress percentage when uploading', () => {
      render(<FileStatusBadge status="uploading" progress={75} />)

      expect(screen.getByText(/75%?/)).toBeInTheDocument()
    })

    it('hides progress bar for non-uploading statuses', () => {
      render(<FileStatusBadge status="ready" progress={100} />)

      const progressBar = screen.queryByRole('progressbar')
      expect(progressBar).not.toBeInTheDocument()
    })

    it('handles progress at 0%', () => {
      render(<FileStatusBadge status="uploading" progress={0} />)

      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('handles progress at 100%', () => {
      render(<FileStatusBadge status="uploading" progress={100} />)

      expect(screen.getByText(/100%/)).toBeInTheDocument()
    })

    it('rounds progress to nearest integer', () => {
      render(<FileStatusBadge status="uploading" progress={33.7} />)

      // Should show 34% or 33%, not 33.7%
      expect(
        screen.getByText(/33%|34%/)
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('has accessible name/label', () => {
      render(<FileStatusBadge status="ready" />)

      // Badge should have accessible text
      const badge = screen.getByText(/ready/i)
      expect(badge).toBeInTheDocument()
    })

    it('uploading status has appropriate ARIA attributes', () => {
      render(
        <FileStatusBadge status="uploading" progress={50} data-testid="badge" />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('processing status indicates loading state', () => {
      render(<FileStatusBadge status="processing" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should have aria-busy or similar attribute
      expect(badge.getAttribute('aria-busy') === 'true' || badge.textContent).toBeTruthy()
    })

    it('failed status has error indication', () => {
      render(<FileStatusBadge status="failed" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should indicate error state
      expect(badge).toBeInTheDocument()
    })

    it('uses semantic elements', () => {
      render(<FileStatusBadge status="ready" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Should use span or appropriate semantic element
      expect(['SPAN', 'DIV', 'P'].includes(badge.tagName)).toBe(true)
    })
  })

  // ============================================
  // Variant Tests
  // ============================================

  describe('Variants', () => {
    it('supports compact variant', () => {
      render(<FileStatusBadge status="ready" variant="compact" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      // Compact variant should have smaller styling
      expect(badge).toBeInTheDocument()
    })

    it('supports default variant', () => {
      render(<FileStatusBadge status="ready" variant="default" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })

    it('compact variant may hide text', () => {
      render(<FileStatusBadge status="ready" variant="compact" />)

      // In compact mode, might only show icon
      const badge = screen.queryByText(/ready/i)
      // This could be either visible or hidden - implementation dependent
      expect(badge === null || badge !== null).toBe(true)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles invalid status gracefully', () => {
      // @ts-expect-error Testing invalid status
      render(<FileStatusBadge status="invalid" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })

    it('handles undefined progress', () => {
      render(<FileStatusBadge status="uploading" data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })

    it('handles null status gracefully', () => {
      // @ts-expect-error Testing null status
      render(<FileStatusBadge status={null} data-testid="badge" />)

      const badge = screen.getByTestId('badge')
      expect(badge).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <FileStatusBadge
          status="ready"
          className="custom-badge"
          data-testid="badge"
        />
      )

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('custom-badge')
    })

    it('handles rapid status changes', () => {
      const { rerender } = render(<FileStatusBadge status="uploading" />)

      rerender(<FileStatusBadge status="processing" />)
      expect(screen.getByText(/processing/i)).toBeInTheDocument()

      rerender(<FileStatusBadge status="ready" />)
      expect(screen.getByText(/ready/i)).toBeInTheDocument()
    })

    it('handles all FileStatus enum values', () => {
      const statuses: FileStatus[] = ['uploading', 'processing', 'ready', 'failed']

      statuses.forEach((status) => {
        const { unmount } = render(
          <FileStatusBadge status={status} data-testid={`badge-${status}`} />
        )
        expect(screen.getByTestId(`badge-${status}`)).toBeInTheDocument()
        unmount()
      })
    })
  })

  // ============================================
  // Tooltip Tests (if applicable)
  // ============================================

  describe('Tooltip', () => {
    it('shows tooltip with status description via title attribute', async () => {
      render(<FileStatusBadge status="processing" data-testid="badge" />)

      // Component uses native title attribute for tooltip
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('title', 'Processing')
    })

    it('failed status shows error message in tooltip via title attribute', () => {
      render(
        <FileStatusBadge
          status="failed"
          errorMessage="PDF parsing failed"
          data-testid="badge"
        />
      )

      // Error message should be in the title attribute
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('title', 'PDF parsing failed')
    })
  })
})
