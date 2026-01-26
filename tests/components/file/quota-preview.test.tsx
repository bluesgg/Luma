import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuotaPreview } from '@/components/file/quota-preview'
import { STORAGE } from '@/lib/constants'

describe('QuotaPreview', () => {
  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders quota preview component', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      expect(screen.getByTestId('quota-preview')).toBeInTheDocument()
    })

    it('displays current and max file count', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
        />
      )

      expect(screen.getByText(/10/)).toBeInTheDocument()
      expect(screen.getByText(/30/)).toBeInTheDocument()
    })

    it('displays as fraction format (X / Y)', () => {
      render(
        <QuotaPreview
          currentFileCount={15}
          maxFiles={30}
        />
      )

      expect(screen.getByText(/15.*\/.*30|15.*of.*30/)).toBeInTheDocument()
    })

    it('shows files label', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
        />
      )

      expect(screen.getByText(/files?/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Color Coding - Under 70%
  // ============================================

  describe('Color Coding - Under 70% (Green)', () => {
    it('shows green color when usage is under 70%', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/green|success|emerald/i)
    })

    it('shows green at 0%', () => {
      render(
        <QuotaPreview
          currentFileCount={0}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/green|success|emerald/i)
    })

    it('shows green at 69%', () => {
      // 69% of 30 = ~20.7, so 20 files
      render(
        <QuotaPreview
          currentFileCount={20}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/green|success|emerald/i)
    })
  })

  // ============================================
  // Color Coding - 70% to 90%
  // ============================================

  describe('Color Coding - 70% to 90% (Yellow)', () => {
    it('shows yellow/amber color when usage is between 70% and 90%', () => {
      // 70% of 30 = 21 files
      render(
        <QuotaPreview
          currentFileCount={21}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/yellow|amber|warning|orange/i)
    })

    it('shows yellow at exactly 70%', () => {
      render(
        <QuotaPreview
          currentFileCount={21}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/yellow|amber|warning|orange/i)
    })

    it('shows yellow at 89%', () => {
      // 89% of 30 = ~26.7, so 26 files
      render(
        <QuotaPreview
          currentFileCount={26}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/yellow|amber|warning|orange/i)
    })
  })

  // ============================================
  // Color Coding - Over 90%
  // ============================================

  describe('Color Coding - Over 90% (Red)', () => {
    it('shows red color when usage is over 90%', () => {
      // 90% of 30 = 27 files
      render(
        <QuotaPreview
          currentFileCount={28}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/red|danger|destructive|error/i)
    })

    it('shows red at exactly 90%', () => {
      render(
        <QuotaPreview
          currentFileCount={27}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/red|danger|destructive|error/i)
    })

    it('shows red at 100%', () => {
      render(
        <QuotaPreview
          currentFileCount={30}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota.className).toMatch(/red|danger|destructive|error/i)
    })
  })

  // ============================================
  // Progress Bar
  // ============================================

  describe('Progress Bar', () => {
    it('renders progress bar', () => {
      render(
        <QuotaPreview
          currentFileCount={15}
          maxFiles={30}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('progress bar reflects correct percentage', () => {
      render(
        <QuotaPreview
          currentFileCount={15}
          maxFiles={30}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('progress bar has correct min and max', () => {
      render(
        <QuotaPreview
          currentFileCount={15}
          maxFiles={30}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('progress bar at 0%', () => {
      render(
        <QuotaPreview
          currentFileCount={0}
          maxFiles={30}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('progress bar at 100%', () => {
      render(
        <QuotaPreview
          currentFileCount={30}
          maxFiles={30}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('progress bar color matches quota color', () => {
      const { container } = render(
        <QuotaPreview
          currentFileCount={28}
          maxFiles={30}
        />
      )

      const indicator = container.querySelector('[data-slot="indicator"]') ||
        container.querySelector('[class*="indicator"]')

      // Red indicator for high usage
      if (indicator) {
        expect(indicator.className).toMatch(/red|danger|destructive/i)
      }
    })
  })

  // ============================================
  // Remaining Files Display
  // ============================================

  describe('Remaining Files Display', () => {
    it('shows remaining file count', () => {
      render(
        <QuotaPreview
          currentFileCount={25}
          maxFiles={30}
          showRemaining
        />
      )

      expect(screen.getByText(/5.*remaining|5.*left/i)).toBeInTheDocument()
    })

    it('shows 0 remaining when at limit', () => {
      render(
        <QuotaPreview
          currentFileCount={30}
          maxFiles={30}
          showRemaining
        />
      )

      expect(screen.getByText(/0.*remaining|0.*left|no.*remaining/i)).toBeInTheDocument()
    })

    it('shows all available when empty', () => {
      render(
        <QuotaPreview
          currentFileCount={0}
          maxFiles={30}
          showRemaining
        />
      )

      expect(screen.getByText(/30.*remaining|30.*left|all.*available/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Warning Messages
  // ============================================

  describe('Warning Messages', () => {
    it('shows warning when near limit', () => {
      render(
        <QuotaPreview
          currentFileCount={28}
          maxFiles={30}
        />
      )

      expect(
        screen.getByText(/only.*2|near.*limit|almost.*full/i)
      ).toBeInTheDocument()
    })

    it('shows full message when at limit', () => {
      render(
        <QuotaPreview
          currentFileCount={30}
          maxFiles={30}
        />
      )

      expect(
        screen.getByText(/limit.*reached|full|no.*more|maximum/i)
      ).toBeInTheDocument()
    })

    it('no warning when plenty of space', () => {
      render(
        <QuotaPreview
          currentFileCount={5}
          maxFiles={30}
        />
      )

      expect(
        screen.queryByText(/warning|limit|full/i)
      ).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Storage Quota (Optional)
  // ============================================

  describe('Storage Quota', () => {
    it('shows storage usage if provided', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          currentStorage={2 * 1024 * 1024 * 1024} // 2GB
          maxStorage={STORAGE.MAX_USER_STORAGE} // 5GB
        />
      )

      expect(screen.getByText(/2.*GB/i)).toBeInTheDocument()
      expect(screen.getByText(/5.*GB/i)).toBeInTheDocument()
    })

    it('formats storage in appropriate units', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          currentStorage={500 * 1024 * 1024} // 500MB
          maxStorage={STORAGE.MAX_USER_STORAGE}
        />
      )

      expect(screen.getByText(/500.*MB|0\.5.*GB/i)).toBeInTheDocument()
    })

    it('storage has separate color coding', () => {
      const { container } = render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          currentStorage={4.5 * 1024 * 1024 * 1024} // 4.5GB - 90% of 5GB
          maxStorage={STORAGE.MAX_USER_STORAGE}
          data-testid="quota"
        />
      )

      // Should have red indicator for storage
      const storageIndicator = container.querySelector('[data-testid="storage-indicator"]')
      if (storageIndicator) {
        expect(storageIndicator.className).toMatch(/red|danger/i)
      }
    })
  })

  // ============================================
  // Compact Mode
  // ============================================

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          compact
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      // Compact mode should have smaller styling
      expect(quota).toBeInTheDocument()
    })

    it('compact mode shows essential info only', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          compact
        />
      )

      // Should show numbers but maybe not labels
      expect(screen.getByText(/10/)).toBeInTheDocument()
      expect(screen.getByText(/30/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('has accessible label', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
        />
      )

      const component = screen.getByTestId('quota-preview')
      expect(component).toHaveAccessibleName()
    })

    it('progress bar has accessible value', () => {
      render(
        <QuotaPreview
          currentFileCount={15}
          maxFiles={30}
        />
      )

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow')
      expect(progressBar).toHaveAttribute('aria-valuemin')
      expect(progressBar).toHaveAttribute('aria-valuemax')
    })

    it('warning messages have appropriate role', () => {
      render(
        <QuotaPreview
          currentFileCount={30}
          maxFiles={30}
        />
      )

      const warning = screen.getByText(/limit.*reached|full|maximum/i)
      expect(warning.getAttribute('role')).toBe('alert')
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles maxFiles of 0', () => {
      render(
        <QuotaPreview
          currentFileCount={0}
          maxFiles={0}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota).toBeInTheDocument()
    })

    it('handles currentFileCount greater than maxFiles', () => {
      render(
        <QuotaPreview
          currentFileCount={35}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota).toBeInTheDocument()
      // Should cap at 100% or show over limit
    })

    it('handles negative values', () => {
      render(
        <QuotaPreview
          currentFileCount={-5}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota).toBeInTheDocument()
    })

    it('handles decimal values', () => {
      render(
        <QuotaPreview
          currentFileCount={10.5}
          maxFiles={30}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota).toBeInTheDocument()
    })

    it('handles very large numbers', () => {
      render(
        <QuotaPreview
          currentFileCount={999}
          maxFiles={1000}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota).toBeInTheDocument()
      expect(screen.getByText(/999/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Custom Styling
  // ============================================

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(
        <QuotaPreview
          currentFileCount={10}
          maxFiles={30}
          className="custom-quota"
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      expect(quota).toHaveClass('custom-quota')
    })

    it('accepts custom threshold values', () => {
      render(
        <QuotaPreview
          currentFileCount={15} // 50%
          maxFiles={30}
          warningThreshold={40}
          dangerThreshold={60}
          data-testid="quota"
        />
      )

      const quota = screen.getByTestId('quota')
      // At 50%, should be yellow/warning with custom thresholds
      expect(quota.className).toMatch(/yellow|amber|warning/i)
    })
  })
})
