// =============================================================================
// Phase 5: Quota Management - QuotaWarning Component Tests (TDD)
// Testing quota warning component with color-coded status
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Component to be implemented
// const QuotaWarning = () => <div>Quota Warning</div>

interface QuotaWarningProps {
  used: number
  limit: number
  resetAt: Date
  bucketName?: string
}

// Mock component for testing
const QuotaWarning: React.FC<QuotaWarningProps> = ({
  used,
  limit,
  resetAt,
  bucketName = 'Quota',
}) => <div>Mock QuotaWarning</div>

describe('QuotaWarning Component (Phase 5 - QUOTA-005)', () => {
  const defaultResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render quota usage information', () => {
      render(<QuotaWarning used={50} limit={150} resetAt={defaultResetAt} />)

      expect(screen.getByText(/50.*150/i)).toBeInTheDocument()
    })

    it('should render percentage used', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      // 75/150 = 50%
      expect(screen.getByText(/50%/i)).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      render(<QuotaWarning used={50} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('should render bucket name if provided', () => {
      render(
        <QuotaWarning
          used={50}
          limit={150}
          resetAt={defaultResetAt}
          bucketName="Learning Interactions"
        />
      )

      expect(screen.getByText(/Learning Interactions/i)).toBeInTheDocument()
    })

    it('should render reset date', () => {
      const resetDate = new Date('2024-12-31')

      render(<QuotaWarning used={50} limit={150} resetAt={resetDate} />)

      expect(screen.getByText(/reset/i)).toBeInTheDocument()
    })
  })

  describe('Color Coding', () => {
    it('should display green color when usage < 70%', () => {
      render(<QuotaWarning used={60} limit={150} resetAt={defaultResetAt} />)

      // 60/150 = 40% - should be green
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/green|success/i)
    })

    it('should display green at exactly 69% usage', () => {
      render(<QuotaWarning used={103} limit={150} resetAt={defaultResetAt} />)

      // 103/150 = 68.67% - should be green
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/green|success/i)
    })

    it('should display yellow color when usage is 70-90%', () => {
      render(<QuotaWarning used={120} limit={150} resetAt={defaultResetAt} />)

      // 120/150 = 80% - should be yellow
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/yellow|warning/i)
    })

    it('should display yellow at exactly 70% usage', () => {
      render(<QuotaWarning used={105} limit={150} resetAt={defaultResetAt} />)

      // 105/150 = 70% - should be yellow
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/yellow|warning/i)
    })

    it('should display yellow at exactly 90% usage', () => {
      render(<QuotaWarning used={135} limit={150} resetAt={defaultResetAt} />)

      // 135/150 = 90% - should be yellow
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/yellow|warning/i)
    })

    it('should display red color when usage > 90%', () => {
      render(<QuotaWarning used={140} limit={150} resetAt={defaultResetAt} />)

      // 140/150 = 93.33% - should be red
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/red|danger|error/i)
    })

    it('should display red at exactly 91% usage', () => {
      render(<QuotaWarning used={137} limit={150} resetAt={defaultResetAt} />)

      // 137/150 = 91.33% - should be red
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/red|danger|error/i)
    })

    it('should display red at 100% usage', () => {
      render(<QuotaWarning used={150} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/red|danger|error/i)
    })
  })

  describe('Progress Bar', () => {
    it('should set correct aria-valuenow', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('should set aria-valuemin to 0', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    })

    it('should set aria-valuemax to 100', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should have correct width based on percentage', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      // 75/150 = 50%
      const progressBarFill = screen.getByTestId('progress-fill')
      expect(progressBarFill).toHaveStyle({ width: '50%' })
    })

    it('should show 0% when no quota used', () => {
      render(<QuotaWarning used={0} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should show 100% when quota exhausted', () => {
      render(<QuotaWarning used={150} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })
  })

  describe('Exhausted State', () => {
    it('should display "Quota exhausted" message at 100%', () => {
      render(<QuotaWarning used={150} limit={150} resetAt={defaultResetAt} />)

      expect(screen.getByText(/quota exhausted|depleted/i)).toBeInTheDocument()
    })

    it('should not display exhausted message when < 100%', () => {
      render(<QuotaWarning used={149} limit={150} resetAt={defaultResetAt} />)

      expect(
        screen.queryByText(/quota exhausted|depleted/i)
      ).not.toBeInTheDocument()
    })

    it('should display reset information when exhausted', () => {
      const resetDate = new Date('2024-12-31')

      render(<QuotaWarning used={150} limit={150} resetAt={resetDate} />)

      expect(screen.getByText(/reset|renew/i)).toBeInTheDocument()
    })

    it('should show remaining time until reset when exhausted', () => {
      const resetDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days

      render(<QuotaWarning used={150} limit={150} resetAt={resetDate} />)

      expect(screen.getByText(/5 days|in 5 days/i)).toBeInTheDocument()
    })
  })

  describe('Tooltip', () => {
    it('should display tooltip on hover', async () => {
      const user = userEvent.setup()

      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      await user.hover(progressBar)

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
    })

    it('should show exact usage numbers in tooltip', async () => {
      const user = userEvent.setup()

      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      await user.hover(progressBar)

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveTextContent(/75/)
        expect(tooltip).toHaveTextContent(/150/)
      })
    })

    it('should show remaining quota in tooltip', async () => {
      const user = userEvent.setup()

      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      await user.hover(progressBar)

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        // 150 - 75 = 75 remaining
        expect(tooltip).toHaveTextContent(/75.*remaining/i)
      })
    })

    it('should show reset date in tooltip', async () => {
      const user = userEvent.setup()
      const resetDate = new Date('2024-12-31')

      render(<QuotaWarning used={75} limit={150} resetAt={resetDate} />)

      const progressBar = screen.getByRole('progressbar')
      await user.hover(progressBar)

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveTextContent(/December|Dec|2024/i)
      })
    })

    it('should hide tooltip when mouse leaves', async () => {
      const user = userEvent.setup()

      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      await user.hover(progressBar)

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })

      await user.unhover(progressBar)

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle 0 usage correctly', () => {
      render(<QuotaWarning used={0} limit={150} resetAt={defaultResetAt} />)

      expect(screen.getByText(/0%/i)).toBeInTheDocument()
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/green|success/i)
    })

    it('should handle very small percentages', () => {
      render(<QuotaWarning used={1} limit={1000} resetAt={defaultResetAt} />)

      // 1/1000 = 0.1% should round to 0%
      expect(screen.getByText(/0%|1%/i)).toBeInTheDocument()
    })

    it('should handle fractional percentages correctly', () => {
      render(<QuotaWarning used={100} limit={150} resetAt={defaultResetAt} />)

      // 100/150 = 66.666...% should round to 67%
      expect(screen.getByText(/67%/i)).toBeInTheDocument()
    })

    it('should handle custom limits', () => {
      render(<QuotaWarning used={50} limit={200} resetAt={defaultResetAt} />)

      // 50/200 = 25%
      expect(screen.getByText(/25%/i)).toBeInTheDocument()
    })

    it('should handle very large quota values', () => {
      render(
        <QuotaWarning used={10000} limit={1000000} resetAt={defaultResetAt} />
      )

      // 10000/1000000 = 1%
      expect(screen.getByText(/1%/i)).toBeInTheDocument()
    })

    it('should handle past reset dates gracefully', () => {
      const pastDate = new Date(Date.now() - 1000)

      render(<QuotaWarning used={75} limit={150} resetAt={pastDate} />)

      // Should still render without crashing
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label')
    })

    it('should have aria-label describing the quota', () => {
      render(
        <QuotaWarning
          used={75}
          limit={150}
          resetAt={defaultResetAt}
          bucketName="Learning Interactions"
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute(
        'aria-label',
        /Learning Interactions/i
      )
    })

    it('should have aria-live region for status updates', () => {
      render(<QuotaWarning used={140} limit={150} resetAt={defaultResetAt} />)

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const component = screen.getByRole('progressbar').parentElement
      expect(component).toHaveAttribute('tabindex', '0')
    })

    it('should announce quota exhaustion to screen readers', () => {
      render(<QuotaWarning used={150} limit={150} resetAt={defaultResetAt} />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent(/quota exhausted|depleted/i)
    })
  })

  describe('Visual Feedback', () => {
    it('should pulse or animate when quota is low', () => {
      render(<QuotaWarning used={140} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass(/pulse|animate/i)
    })

    it('should not animate when quota is healthy', () => {
      render(<QuotaWarning used={50} limit={150} resetAt={defaultResetAt} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).not.toHaveClass(/pulse|animate/i)
    })

    it('should show warning icon when quota > 90%', () => {
      render(<QuotaWarning used={140} limit={150} resetAt={defaultResetAt} />)

      const warningIcon = screen.getByTestId('warning-icon')
      expect(warningIcon).toBeInTheDocument()
    })

    it('should show check icon when quota < 70%', () => {
      render(<QuotaWarning used={50} limit={150} resetAt={defaultResetAt} />)

      const checkIcon = screen.getByTestId('check-icon')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should render compact mode on small screens', () => {
      // Mock small viewport
      global.innerWidth = 375

      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const component = screen.getByTestId('quota-warning')
      expect(component).toHaveClass(/compact/i)
    })

    it('should render full mode on large screens', () => {
      // Mock large viewport
      global.innerWidth = 1024

      render(<QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />)

      const component = screen.getByTestId('quota-warning')
      expect(component).not.toHaveClass(/compact/i)
    })
  })

  describe('Integration with Theme', () => {
    it('should respect dark mode colors', () => {
      // Mock dark mode context
      const { container } = render(
        <div className="dark">
          <QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />
        </div>
      )

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveClass(/dark/i)
    })

    it('should respect light mode colors', () => {
      const { container } = render(
        <QuotaWarning used={75} limit={150} resetAt={defaultResetAt} />
      )

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).not.toHaveClass(/dark/i)
    })
  })
})
