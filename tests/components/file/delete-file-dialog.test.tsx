// =============================================================================
// FILE-012: DeleteFileDialog Component Tests (TDD)
// Confirmation dialog for file deletion
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { mockFile } from '../../setup'

interface File {
  id: string
  name: string
  status: string
}

// Component to be implemented
const DeleteFileDialog = ({
  file,
  open,
  onClose,
  onConfirm,
  isDeleting,
}: {
  file: File | null
  open: boolean
  onClose: () => void
  onConfirm: (fileId: string) => void
  isDeleting?: boolean
}) => {
  if (!open || !file) return null

  return (
    <div data-testid="delete-dialog" role="dialog">
      <h2>Delete File</h2>
      <p data-testid="file-name">{file.name}</p>
      <p data-testid="warning">This action cannot be undone</p>
      <button onClick={onClose} data-testid="cancel-btn" disabled={isDeleting}>
        Cancel
      </button>
      <button
        onClick={() => onConfirm(file.id)}
        data-testid="confirm-btn"
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}

describe('DeleteFileDialog Component (FILE-012)', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  const testFile: File = {
    id: 'file-123',
    name: 'test.pdf',
    status: 'READY',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
    })

    it('should not render when file is null', () => {
      render(
        <DeleteFileDialog
          file={null}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
    })

    it('should display file name', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('file-name')).toHaveTextContent('test.pdf')
    })

    it('should show warning message', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('warning')).toHaveTextContent(
        /cannot be undone/i
      )
    })

    it('should show dialog title', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/delete file/i)).toBeInTheDocument()
    })
  })

  describe('User Actions', () => {
    it('should have cancel button', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('cancel-btn')).toBeInTheDocument()
    })

    it('should have confirm button', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('confirm-btn')).toBeInTheDocument()
    })

    it('should call onClose when cancel is clicked', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.click(screen.getByTestId('cancel-btn'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm with fileId when confirm is clicked', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-btn'))

      expect(mockOnConfirm).toHaveBeenCalledWith('file-123')
    })

    it('should close dialog on backdrop click', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const backdrop = screen.getByTestId('dialog-backdrop')
      fireEvent.click(backdrop)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close on Escape key press', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Deleting State', () => {
    it('should disable buttons when deleting', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />
      )

      expect(screen.getByTestId('cancel-btn')).toBeDisabled()
      expect(screen.getByTestId('confirm-btn')).toBeDisabled()
    })

    it('should show loading text on confirm button', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />
      )

      expect(screen.getByTestId('confirm-btn')).toHaveTextContent(/deleting/i)
    })

    it('should show loading spinner when deleting', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should prevent backdrop close when deleting', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />
      )

      const backdrop = screen.getByTestId('dialog-backdrop')
      fireEvent.click(backdrop)

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should prevent Escape close when deleting', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          isDeleting={true}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Cascade Deletion Warning', () => {
    it('should warn about AI data deletion', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/ai.*data.*deleted/i)).toBeInTheDocument()
    })

    it('should warn about learning progress deletion', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/learning.*progress/i)).toBeInTheDocument()
    })

    it('should list items that will be deleted', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByText(/knowledge structure/i)).toBeInTheDocument()
      expect(screen.getByText(/explanations/i)).toBeInTheDocument()
      expect(screen.getByText(/learning sessions/i)).toBeInTheDocument()
    })

    it('should highlight destructive action', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmBtn = screen.getByTestId('confirm-btn')
      expect(confirmBtn).toHaveClass('destructive')
    })
  })

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-labelledby', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should have aria-describedby', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('should trap focus within dialog', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const cancelBtn = screen.getByTestId('cancel-btn')
      const confirmBtn = screen.getByTestId('confirm-btn')

      cancelBtn.focus()
      expect(document.activeElement).toBe(cancelBtn)

      // Tab should move to next element within dialog
      fireEvent.keyDown(cancelBtn, { key: 'Tab' })
      expect(document.activeElement).toBe(confirmBtn)
    })

    it('should focus confirm button by default', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmBtn = screen.getByTestId('confirm-btn')
      expect(document.activeElement).toBe(confirmBtn)
    })

    it('should announce dialog opening to screen readers', () => {
      const { rerender } = render(
        <DeleteFileDialog
          file={testFile}
          open={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      rerender(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Button Styles', () => {
    it('should style cancel button as secondary', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const cancelBtn = screen.getByTestId('cancel-btn')
      expect(cancelBtn).toHaveClass('secondary')
    })

    it('should style confirm button as destructive', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmBtn = screen.getByTestId('confirm-btn')
      expect(confirmBtn).toHaveClass('destructive')
    })

    it('should highlight confirm button in red', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmBtn = screen.getByTestId('confirm-btn')
      expect(confirmBtn).toHaveClass('bg-red-600')
    })
  })

  describe('Edge Cases', () => {
    it('should handle long file names', () => {
      const longFile = {
        ...testFile,
        name: 'a'.repeat(200) + '.pdf',
      }

      render(
        <DeleteFileDialog
          file={longFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const fileName = screen.getByTestId('file-name')
      expect(fileName).toHaveClass('truncate')
    })

    it('should handle unicode file names', () => {
      const unicodeFile = {
        ...testFile,
        name: '课程资料.pdf',
      }

      render(
        <DeleteFileDialog
          file={unicodeFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('file-name')).toHaveTextContent('课程资料.pdf')
    })

    it('should handle special characters in file names', () => {
      const specialFile = {
        ...testFile,
        name: 'lecture-2024 (final).pdf',
      }

      render(
        <DeleteFileDialog
          file={specialFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('file-name')).toHaveTextContent(
        'lecture-2024 (final).pdf'
      )
    })

    it('should handle rapid open/close', () => {
      const { rerender } = render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      rerender(
        <DeleteFileDialog
          file={testFile}
          open={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      rerender(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    it('should handle file change while open', () => {
      const { rerender } = render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const newFile = { ...testFile, id: 'file-456', name: 'other.pdf' }

      rerender(
        <DeleteFileDialog
          file={newFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      expect(screen.getByTestId('file-name')).toHaveTextContent('other.pdf')
    })
  })

  describe('Animation', () => {
    it('should animate dialog entrance', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const dialog = screen.getByTestId('delete-dialog')
      expect(dialog).toHaveClass('animate-in')
    })

    it('should animate dialog exit', async () => {
      const { rerender } = render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      rerender(
        <DeleteFileDialog
          file={testFile}
          open={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      await waitFor(() => {
        expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument()
      })
    })

    it('should fade in backdrop', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const backdrop = screen.getByTestId('dialog-backdrop')
      expect(backdrop).toHaveClass('fade-in')
    })
  })

  describe('Double Confirmation', () => {
    it('should not call onConfirm twice on rapid clicks', async () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmBtn = screen.getByTestId('confirm-btn')

      fireEvent.click(confirmBtn)
      fireEvent.click(confirmBtn)
      fireEvent.click(confirmBtn)

      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it('should debounce confirm clicks', () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      const confirmBtn = screen.getByTestId('confirm-btn')

      for (let i = 0; i < 10; i++) {
        fireEvent.click(confirmBtn)
      }

      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration', () => {
    it('should work with useFiles hook', async () => {
      const mockDeleteFile = vi.fn()

      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockDeleteFile}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-btn'))

      expect(mockDeleteFile).toHaveBeenCalledWith('file-123')
    })

    it('should close after successful deletion', async () => {
      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('should show error message on deletion failure', async () => {
      const mockFailedConfirm = vi.fn().mockRejectedValue(new Error('Failed'))

      render(
        <DeleteFileDialog
          file={testFile}
          open={true}
          onClose={mockOnClose}
          onConfirm={mockFailedConfirm}
        />
      )

      fireEvent.click(screen.getByTestId('confirm-btn'))

      await waitFor(() => {
        expect(screen.getByText(/failed to delete/i)).toBeInTheDocument()
      })
    })
  })
})
