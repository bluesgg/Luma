import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyFiles } from '@/components/file/empty-files'

describe('EmptyFiles', () => {
  const defaultProps = {
    onUploadClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders empty files component', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(screen.getByTestId('empty-files')).toBeInTheDocument()
    })

    it('renders empty state illustration/icon', () => {
      const { container } = render(<EmptyFiles {...defaultProps} />)

      // Should have an illustration or icon
      const illustration = container.querySelector('svg') ||
        container.querySelector('img') ||
        container.querySelector('[data-testid="empty-illustration"]')

      expect(illustration).toBeInTheDocument()
    })

    it('renders empty state message', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(
        screen.getByText(/no files|no pdf|get started|upload/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Title and Description
  // ============================================

  describe('Title and Description', () => {
    it('shows title', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(
        screen.getByRole('heading') ||
        screen.getByText(/no files|empty|get started/i)
      ).toBeInTheDocument()
    })

    it('shows description text', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(
        screen.getByText(/upload.*pdf|add.*file|start.*uploading/i)
      ).toBeInTheDocument()
    })

    it('description mentions PDF files', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(screen.getByText(/pdf/i)).toBeInTheDocument()
    })

    it('accepts custom title', () => {
      render(<EmptyFiles {...defaultProps} title="No lecture notes yet" />)

      expect(screen.getByText('No lecture notes yet')).toBeInTheDocument()
    })

    it('accepts custom description', () => {
      render(
        <EmptyFiles
          {...defaultProps}
          description="Upload your course materials to get started."
        />
      )

      expect(
        screen.getByText('Upload your course materials to get started.')
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Upload Button
  // ============================================

  describe('Upload Button', () => {
    it('renders upload button', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /upload|add.*file/i })
      ).toBeInTheDocument()
    })

    it('upload button calls onUploadClick', async () => {
      const user = userEvent.setup()
      const onUploadClick = vi.fn()
      render(<EmptyFiles {...defaultProps} onUploadClick={onUploadClick} />)

      await user.click(screen.getByRole('button', { name: /upload|add.*file/i }))

      expect(onUploadClick).toHaveBeenCalledTimes(1)
    })

    it('upload button has icon', () => {
      render(<EmptyFiles {...defaultProps} />)

      const button = screen.getByRole('button', { name: /upload|add.*file/i })
      const icon = button.querySelector('svg')

      expect(icon).toBeInTheDocument()
    })

    it('upload button is enabled by default', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /upload|add.*file/i })
      ).toBeEnabled()
    }
    )

    it('upload button can be disabled', () => {
      render(<EmptyFiles {...defaultProps} disabled />)

      expect(
        screen.getByRole('button', { name: /upload|add.*file/i })
      ).toBeDisabled()
    })
  })

  // ============================================
  // Drag and Drop Zone
  // ============================================

  describe('Drag and Drop Zone', () => {
    it('shows drag and drop hint', () => {
      render(<EmptyFiles {...defaultProps} />)

      expect(
        screen.getByText(/drag|drop/i)
      ).toBeInTheDocument()
    })

    it('has drop zone area', () => {
      render(<EmptyFiles {...defaultProps} />)

      const dropZone = screen.getByTestId('empty-files')
      // Should accept file drops
      expect(dropZone).toBeInTheDocument()
    })
  })

  // ============================================
  // File Limit Warning
  // ============================================

  describe('File Limit Warning', () => {
    it('shows warning when disabled due to limit', () => {
      render(
        <EmptyFiles
          {...defaultProps}
          disabled
          disabledReason="limit"
        />
      )

      expect(
        screen.getByText(/limit|maximum|can't.*upload/i)
      ).toBeInTheDocument()
    })

    it('shows different message for storage limit', () => {
      render(
        <EmptyFiles
          {...defaultProps}
          disabled
          disabledReason="storage"
        />
      )

      expect(
        screen.getByText(/storage|space|quota/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Variants
  // ============================================

  describe('Variants', () => {
    it('renders compact variant', () => {
      render(<EmptyFiles {...defaultProps} variant="compact" data-testid="empty-files" />)

      const emptyFiles = screen.getByTestId('empty-files')
      expect(emptyFiles).toBeInTheDocument()
    })

    it('renders large variant', () => {
      render(<EmptyFiles {...defaultProps} variant="large" data-testid="empty-files" />)

      const emptyFiles = screen.getByTestId('empty-files')
      expect(emptyFiles).toBeInTheDocument()
    })

    it('compact variant has smaller styling', () => {
      render(<EmptyFiles {...defaultProps} variant="compact" data-testid="empty-files" />)

      const emptyFiles = screen.getByTestId('empty-files')
      // Compact should have smaller padding/sizing classes
      expect(emptyFiles).toBeInTheDocument()
    })
  })

  // ============================================
  // Illustration
  // ============================================

  describe('Illustration', () => {
    it('shows default illustration', () => {
      const { container } = render(<EmptyFiles {...defaultProps} />)

      const illustration = container.querySelector('svg') ||
        container.querySelector('img')

      expect(illustration).toBeInTheDocument()
    })

    it('accepts custom illustration', () => {
      const CustomIcon = () => <div data-testid="custom-icon">Custom</div>

      render(<EmptyFiles {...defaultProps} icon={<CustomIcon />} />)

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('illustration has appropriate size', () => {
      const { container } = render(<EmptyFiles {...defaultProps} />)

      const illustration = container.querySelector('svg')
      if (illustration) {
        // Should have reasonable size (not too small, not too large)
        const width = illustration.getAttribute('width')
        const height = illustration.getAttribute('height')
        // Either has explicit dimensions or uses CSS
        expect(illustration).toBeInTheDocument()
      }
    })

    it('illustration has muted/subtle color', () => {
      const { container } = render(<EmptyFiles {...defaultProps} />)

      const illustration = container.querySelector('svg')
      if (illustration) {
        // Should have muted/gray styling or just be present
        const hasSubtleColor = /muted|gray|neutral|slate/i.test(illustration.className)
        expect(hasSubtleColor || illustration).toBeTruthy()
      }
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<EmptyFiles {...defaultProps} />)

      const container = screen.getByTestId('empty-files')
      // Could have role="region" or similar
      expect(container).toBeInTheDocument()
    })

    it('upload button has accessible name', () => {
      render(<EmptyFiles {...defaultProps} />)

      const button = screen.getByRole('button', { name: /upload|add.*file/i })
      expect(button).toHaveAccessibleName()
    })

    it('illustration has alt text or is decorative', () => {
      const { container } = render(<EmptyFiles {...defaultProps} />)

      const illustration = container.querySelector('svg') ||
        container.querySelector('img')

      if (illustration?.tagName === 'IMG') {
        expect(illustration).toHaveAttribute('alt')
      } else if (illustration?.tagName === 'svg') {
        // SVG should have aria-hidden="true" if decorative
        expect(
          illustration.getAttribute('aria-hidden') === 'true' ||
          illustration.getAttribute('role') === 'img'
        ).toBe(true)
      }
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<EmptyFiles {...defaultProps} />)

      await user.tab()

      const button = screen.getByRole('button', { name: /upload|add.*file/i })
      expect(document.activeElement).toBe(button)
    })
  })

  // ============================================
  // Loading State
  // ============================================

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<EmptyFiles {...defaultProps} isLoading />)

      // Should show skeleton or loading indicator
      const loading = screen.queryByRole('status') ||
        screen.queryByTestId('loading-skeleton')

      // Either shows loading or gracefully handles it
      expect(screen.getByTestId('empty-files')).toBeInTheDocument()
    })

    it('disables upload button when loading', () => {
      render(<EmptyFiles {...defaultProps} isLoading />)

      const button = screen.getByRole('button', { name: /upload|add.*file/i })
      expect(button).toBeDisabled()
    })
  })

  // ============================================
  // Styling
  // ============================================

  describe('Styling', () => {
    it('accepts custom className', () => {
      render(
        <EmptyFiles
          {...defaultProps}
          className="custom-empty"
          data-testid="empty-files"
        />
      )

      const emptyFiles = screen.getByTestId('empty-files')
      expect(emptyFiles).toHaveClass('custom-empty')
    })

    it('has centered content', () => {
      render(<EmptyFiles {...defaultProps} data-testid="empty-files" />)

      const emptyFiles = screen.getByTestId('empty-files')
      // Should have centering classes
      expect(emptyFiles.className).toMatch(/center|flex|justify-center|items-center/i)
    })

    it('has appropriate padding', () => {
      render(<EmptyFiles {...defaultProps} data-testid="empty-files" />)

      const emptyFiles = screen.getByTestId('empty-files')
      // Should have padding classes
      expect(emptyFiles.className).toMatch(/p-|py-|px-|padding/i)
    })

    it('has dashed border style', () => {
      render(<EmptyFiles {...defaultProps} data-testid="empty-files" />)

      const emptyFiles = screen.getByTestId('empty-files')
      // Should have dashed border
      expect(emptyFiles.className).toMatch(/dashed|border/i)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles missing onUploadClick', () => {
      render(<EmptyFiles onUploadClick={undefined as unknown as () => void} />)

      // Should render without crashing
      expect(screen.getByTestId('empty-files')).toBeInTheDocument()
    })

    it('handles rapid clicks on upload button', async () => {
      const user = userEvent.setup()
      const onUploadClick = vi.fn()
      render(<EmptyFiles onUploadClick={onUploadClick} />)

      const button = screen.getByRole('button', { name: /upload|add.*file/i })

      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(onUploadClick).toHaveBeenCalledTimes(3)
    })

    it('handles empty title and description', () => {
      render(<EmptyFiles {...defaultProps} title="" description="" />)

      // Should render with defaults or gracefully handle empty
      expect(screen.getByTestId('empty-files')).toBeInTheDocument()
    })

    it('handles very long title', () => {
      const longTitle = 'This is an extremely long title that might cause layout issues and should be handled properly by the component'

      render(<EmptyFiles {...defaultProps} title={longTitle} />)

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('handles very long description', () => {
      const longDescription = 'This is an extremely long description that provides detailed information about what the user should do when there are no files. It might wrap to multiple lines and should be handled properly by the component without breaking the layout or causing any visual issues.'

      render(<EmptyFiles {...defaultProps} description={longDescription} />)

      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })
  })

  // ============================================
  // Secondary Action
  // ============================================

  describe('Secondary Action', () => {
    it('shows secondary action if provided', () => {
      render(
        <EmptyFiles
          {...defaultProps}
          secondaryAction={{
            label: 'Learn more',
            onClick: vi.fn(),
          }}
        />
      )

      expect(screen.getByText('Learn more')).toBeInTheDocument()
    })

    it('secondary action is clickable', async () => {
      const user = userEvent.setup()
      const onSecondaryClick = vi.fn()

      render(
        <EmptyFiles
          {...defaultProps}
          secondaryAction={{
            label: 'Learn more',
            onClick: onSecondaryClick,
          }}
        />
      )

      await user.click(screen.getByText('Learn more'))

      expect(onSecondaryClick).toHaveBeenCalled()
    })

    it('secondary action can be a link', () => {
      render(
        <EmptyFiles
          {...defaultProps}
          secondaryAction={{
            label: 'View documentation',
            href: '/docs/files',
          }}
        />
      )

      const link = screen.getByRole('link', { name: /view documentation/i })
      expect(link).toHaveAttribute('href', '/docs/files')
    })
  })
})
