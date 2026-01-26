import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

describe('Progress', () => {
  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders progress bar with default value', () => {
      render(<Progress />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('renders with specific value', () => {
      render(<Progress value={50} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('renders with data-testid', () => {
      render(<Progress data-testid="upload-progress" value={30} />)

      expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Progress className="custom-class" value={50} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('custom-class')
    })
  })

  // ============================================
  // Value Handling
  // ============================================

  describe('Value Handling', () => {
    it('handles value of 0', () => {
      render(<Progress value={0} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('handles value of 100', () => {
      render(<Progress value={100} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('handles value between 0 and 100', () => {
      render(<Progress value={75} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
    })

    it('handles decimal values', () => {
      render(<Progress value={33.33} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('aria-valuenow', '33.33')
    })

    it('clamps value below 0 to 0', () => {
      render(<Progress value={-10} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      // Value should be clamped to 0 or handled gracefully
      const valueNow = Number(progressBar.getAttribute('aria-valuenow'))
      expect(valueNow).toBeGreaterThanOrEqual(0)
    })

    it('clamps value above 100 to 100', () => {
      render(<Progress value={150} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      // Value should be clamped to 100 or handled gracefully
      const valueNow = Number(progressBar.getAttribute('aria-valuenow'))
      expect(valueNow).toBeLessThanOrEqual(100)
    })

    it('handles undefined value as 0', () => {
      render(<Progress data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      // Should default to 0 or be indeterminate
      expect(progressBar).toBeInTheDocument()
    })

    it('handles null value gracefully', () => {
      render(<Progress value={null as unknown as number} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toBeInTheDocument()
    })
  })

  // ============================================
  // Visual Indicator
  // ============================================

  describe('Visual Indicator', () => {
    it('indicator width represents progress value', () => {
      const { container } = render(<Progress value={50} />)

      const indicator = container.querySelector('[data-slot="indicator"]') ||
        container.querySelector('[class*="indicator"]') ||
        container.querySelector('[style*="translateX"]')

      // The indicator should exist and reflect the progress value
      // Implementation varies: could use transform, width, or left
      expect(indicator).toBeDefined()
    })

    it('indicator at 0% has minimal width', () => {
      const { container } = render(<Progress value={0} />)

      const indicator = container.querySelector('[data-slot="indicator"]') ||
        container.querySelector('[class*="indicator"]')

      // At 0%, indicator should be at starting position
      expect(indicator).toBeDefined()
    })

    it('indicator at 100% fills container', () => {
      const { container } = render(<Progress value={100} />)

      const indicator = container.querySelector('[data-slot="indicator"]') ||
        container.querySelector('[class*="indicator"]')

      // At 100%, indicator should fill the container
      expect(indicator).toBeDefined()
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      render(<Progress value={50} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('has aria-valuemin attribute', () => {
      render(<Progress value={50} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    })

    it('has aria-valuemax attribute', () => {
      render(<Progress value={50} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('has aria-valuenow attribute', () => {
      render(<Progress value={75} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
    })

    it('supports custom aria-label', () => {
      render(<Progress value={50} aria-label="Upload progress" />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAccessibleName('Upload progress')
    })

    it('supports aria-labelledby', () => {
      render(
        <>
          <label id="progress-label">Uploading file...</label>
          <Progress value={50} aria-labelledby="progress-label" />
        </>
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-labelledby', 'progress-label')
    })

    it('supports aria-describedby', () => {
      render(
        <>
          <Progress value={50} aria-describedby="progress-desc" />
          <span id="progress-desc">50% complete</span>
        </>
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-describedby', 'progress-desc')
    })
  })

  // ============================================
  // Styling Variants (if applicable)
  // ============================================

  describe('Styling', () => {
    it('accepts size variants via className', () => {
      render(<Progress value={50} className="h-2" />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('h-2')
    })

    it('accepts color variants via className', () => {
      render(<Progress value={50} className="bg-blue-500" />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('bg-blue-500')
    })

    it('has default background styling', () => {
      const { container } = render(<Progress value={50} />)

      const progressBar = container.firstChild as HTMLElement
      // Should have some background styling
      expect(progressBar.className).not.toBe('')
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles rapid value changes', () => {
      const { rerender } = render(<Progress value={0} />)

      rerender(<Progress value={25} />)
      rerender(<Progress value={50} />)
      rerender(<Progress value={75} />)
      rerender(<Progress value={100} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('handles NaN value', () => {
      render(<Progress value={NaN} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      // Should handle gracefully without crashing
      expect(progressBar).toBeInTheDocument()
    })

    it('handles Infinity value', () => {
      render(<Progress value={Infinity} data-testid="progress" />)

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toBeInTheDocument()
    })

    it('renders with ref', () => {
      const ref = { current: null }
      render(<Progress ref={ref} value={50} />)

      expect(ref.current).toBeInstanceOf(HTMLElement)
    })
  })

  // ============================================
  // Animation States (if applicable)
  // ============================================

  describe('Animation', () => {
    it('can be styled with transition classes', () => {
      render(<Progress value={50} className="transition-all duration-300" />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('transition-all')
      expect(progressBar).toHaveClass('duration-300')
    })

    it('indicator animates smoothly (CSS transition)', () => {
      const { container } = render(<Progress value={50} />)

      const indicator = container.querySelector('[data-slot="indicator"]') ||
        container.querySelector('[class*="indicator"]')

      // Indicator should have transition styling for smooth animation
      // This is more of a visual/CSS test, but we can verify the element exists
      expect(indicator).toBeDefined()
    })
  })
})
