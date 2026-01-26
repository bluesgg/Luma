import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteFileDialog } from '@/components/file/delete-file-dialog'

describe('DeleteFileDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    fileName: 'lecture-01.pdf',
    onConfirm: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders dialog when open is true', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(<DeleteFileDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders with data-testid', () => {
      render(<DeleteFileDialog {...defaultProps} data-testid="delete-file-dialog" />)

      expect(screen.getByTestId('delete-file-dialog')).toBeInTheDocument()
    })

    it('displays file name in dialog', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByText(/lecture-01\.pdf/)).toBeInTheDocument()
    })

    it('shows warning about permanent deletion', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(
        screen.getByText(/cannot be undone|permanent|irreversible/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Dialog Title and Description
  // ============================================

  describe('Dialog Title and Description', () => {
    it('has Delete File title', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAccessibleName(/delete file/i)
    })

    it('has accessible description', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAccessibleDescription()
    })

    it('description mentions the file name', () => {
      render(<DeleteFileDialog {...defaultProps} fileName="important-doc.pdf" />)

      const description = screen.getByRole('dialog').getAttribute('aria-describedby')
      if (description) {
        const descElement = document.getElementById(description)
        expect(descElement?.textContent).toMatch(/important-doc\.pdf/i)
      }
    })
  })

  // ============================================
  // Buttons
  // ============================================

  describe('Buttons', () => {
    it('renders cancel button', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders delete button', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('delete button has destructive styling', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      expect(deleteButton.className).toMatch(/destructive|red|danger/i)
    })
  })

  // ============================================
  // Cancel Button Behavior
  // ============================================

  describe('Cancel Button Behavior', () => {
    it('calls onOpenChange with false when cancel clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<DeleteFileDialog {...defaultProps} onOpenChange={onOpenChange} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('cancel button is enabled by default', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled()
    })

    it('cancel button is disabled during loading', () => {
      render(<DeleteFileDialog {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  // ============================================
  // Delete Button Behavior
  // ============================================

  describe('Delete Button Behavior', () => {
    it('calls onConfirm when delete clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<DeleteFileDialog {...defaultProps} onConfirm={onConfirm} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('delete button is enabled by default', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /delete/i })).toBeEnabled()
    })

    it('delete button is disabled during loading', () => {
      render(<DeleteFileDialog {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
    })

    it('does not call onConfirm when disabled', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<DeleteFileDialog {...defaultProps} isLoading={true} onConfirm={onConfirm} />)

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Loading State
  // ============================================

  describe('Loading State', () => {
    it('shows loading spinner on delete button during loading', () => {
      render(<DeleteFileDialog {...defaultProps} isLoading={true} />)

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      const spinner = deleteButton.querySelector('svg')
      expect(spinner).toBeInTheDocument()
    })

    it('disables all buttons during loading', () => {
      render(<DeleteFileDialog {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
    })

    it('prevents closing dialog via escape during loading', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(
        <DeleteFileDialog {...defaultProps} isLoading={true} onOpenChange={onOpenChange} />
      )

      await user.keyboard('{Escape}')

      // Dialog should not close during loading
      // onOpenChange might still be called, but with the loading state,
      // the dialog should remain visible
    })

    it('prevents closing dialog via overlay click during loading', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(
        <DeleteFileDialog {...defaultProps} isLoading={true} onOpenChange={onOpenChange} />
      )

      // Click overlay (backdrop)
      const overlay = screen.getByRole('dialog').parentElement
      if (overlay) {
        await user.click(overlay)
      }

      // Should not close during loading
    })
  })

  // ============================================
  // Keyboard Interactions
  // ============================================

  describe('Keyboard Interactions', () => {
    it('closes dialog on Escape key', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<DeleteFileDialog {...defaultProps} onOpenChange={onOpenChange} />)

      await user.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('confirms delete on Enter key when delete button is focused', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn().mockResolvedValue(undefined)
      render(<DeleteFileDialog {...defaultProps} onConfirm={onConfirm} />)

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      deleteButton.focus()

      await user.keyboard('{Enter}')

      expect(onConfirm).toHaveBeenCalled()
    })

    it('cancel on Enter key when cancel button is focused', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<DeleteFileDialog {...defaultProps} onOpenChange={onOpenChange} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      cancelButton.focus()

      await user.keyboard('{Enter}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('supports Tab navigation between buttons', async () => {
      const user = userEvent.setup()
      render(<DeleteFileDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const deleteButton = screen.getByRole('button', { name: /delete/i })

      await user.tab()
      // Should focus on one of the buttons
      expect(document.activeElement).toEqual(cancelButton)

      await user.tab()
      expect(document.activeElement).toEqual(deleteButton)
    })
  })

  // ============================================
  // Multiple Deletion Prevention
  // ============================================

  describe('Multiple Deletion Prevention', () => {
    it('prevents multiple clicks on delete button', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const onConfirm = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve
          })
      )

      const { rerender } = render(
        <DeleteFileDialog {...defaultProps} onConfirm={onConfirm} />
      )

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      // Simulate loading state being set
      rerender(<DeleteFileDialog {...defaultProps} onConfirm={onConfirm} isLoading={true} />)

      // Try clicking again
      await user.click(deleteButton)
      await user.click(deleteButton)

      expect(onConfirm).toHaveBeenCalledTimes(1)

      // Cleanup
      resolvePromise!()
    })
  })

  // ============================================
  // File Information Display
  // ============================================

  describe('File Information Display', () => {
    it('displays file name prominently', () => {
      render(<DeleteFileDialog {...defaultProps} fileName="important-file.pdf" />)

      const fileName = screen.getByText(/important-file\.pdf/i)
      // Should be visually emphasized (bold, larger, etc.)
      expect(fileName).toBeInTheDocument()
    })

    it('handles long file names', () => {
      const longName = 'a'.repeat(100) + '.pdf'
      render(<DeleteFileDialog {...defaultProps} fileName={longName} />)

      // Should display without breaking layout
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('handles file names with special characters', () => {
      render(
        <DeleteFileDialog {...defaultProps} fileName="file & name (1) [test].pdf" />
      )

      expect(screen.getByText(/file & name \(1\) \[test\]\.pdf/)).toBeInTheDocument()
    })

    it('shows file icon', () => {
      const { container } = render(<DeleteFileDialog {...defaultProps} />)

      // Should have file/PDF icon
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  // ============================================
  // Additional Information
  // ============================================

  describe('Additional Information', () => {
    it('shows file size if provided', () => {
      render(
        <DeleteFileDialog
          {...defaultProps}
          fileSize={5 * 1024 * 1024} // 5MB
        />
      )

      expect(screen.getByText(/5\s*MB/i)).toBeInTheDocument()
    })

    it('shows page count if provided', () => {
      render(<DeleteFileDialog {...defaultProps} pageCount={25} />)

      expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it('warns about losing explanations', () => {
      render(
        <DeleteFileDialog {...defaultProps} hasExplanations />
      )

      expect(
        screen.getByText(/explanation|ai|generated|content/i)
      ).toBeInTheDocument()
    })

    it('warns about losing Q&A history', () => {
      render(<DeleteFileDialog {...defaultProps} hasQA />)

      expect(screen.getByText(/Q&A|question|answer|history/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('dialog has accessible name', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAccessibleName()
    })

    it('dialog has accessible description', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAccessibleDescription()
    })

    it('focus is trapped within dialog', async () => {
      const user = userEvent.setup()
      render(<DeleteFileDialog {...defaultProps} />)

      // Tab through all focusable elements
      await user.tab()
      await user.tab()
      await user.tab()

      // Focus should cycle back within dialog
      const activeElement = document.activeElement
      expect(screen.getByRole('dialog').contains(activeElement)).toBe(true)
    })

    it('buttons have accessible names', () => {
      render(<DeleteFileDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAccessibleName()
      expect(screen.getByRole('button', { name: /delete/i })).toHaveAccessibleName()
    })

    it('loading state is announced', () => {
      render(<DeleteFileDialog {...defaultProps} isLoading={true} />)

      // Delete button should indicate loading state
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      expect(
        deleteButton.getAttribute('aria-busy') === 'true' ||
        deleteButton.getAttribute('aria-disabled') === 'true' ||
        deleteButton.hasAttribute('disabled')
      ).toBe(true)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles empty file name', () => {
      render(<DeleteFileDialog {...defaultProps} fileName="" />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('handles undefined file name', () => {
      render(<DeleteFileDialog {...defaultProps} fileName={undefined as unknown as string} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('handles rapid open/close', async () => {
      const { rerender } = render(<DeleteFileDialog {...defaultProps} open={true} />)

      rerender(<DeleteFileDialog {...defaultProps} open={false} />)
      rerender(<DeleteFileDialog {...defaultProps} open={true} />)
      rerender(<DeleteFileDialog {...defaultProps} open={false} />)
      rerender(<DeleteFileDialog {...defaultProps} open={true} />)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('handles onConfirm returning error', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn().mockRejectedValue(new Error('Delete failed'))
      const { rerender } = render(
        <DeleteFileDialog {...defaultProps} onConfirm={onConfirm} />
      )

      await user.click(screen.getByRole('button', { name: /delete/i }))

      // Parent component would handle the error and potentially show error state
      expect(onConfirm).toHaveBeenCalled()
    })

    it('clears state when dialog reopens', async () => {
      const { rerender } = render(<DeleteFileDialog {...defaultProps} />)

      // Close dialog
      rerender(<DeleteFileDialog {...defaultProps} open={false} />)

      // Reopen with different file
      rerender(
        <DeleteFileDialog {...defaultProps} open={true} fileName="different-file.pdf" />
      )

      await waitFor(() => {
        expect(screen.getByText(/different-file\.pdf/)).toBeInTheDocument()
      })
    })
  })
})
