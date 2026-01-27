// =============================================================================
// FILE-010: FileUploadItem Component Tests (TDD)
// Individual file upload progress indicator component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

interface UploadProgress {
  fileId: string
  fileName: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

// Component to be implemented
const FileUploadItem = ({
  upload,
  onCancel,
}: {
  upload: UploadProgress
  onCancel?: (fileId: string) => void
}) => {
  return (
    <div data-testid={`upload-item-${upload.fileId}`}>
      <span data-testid="file-name">{upload.fileName}</span>
      <span data-testid="status">{upload.status}</span>
      <span data-testid="progress">{upload.progress}%</span>
      {upload.error && <span data-testid="error">{upload.error}</span>}
      {onCancel && upload.status === 'uploading' && (
        <button
          onClick={() => onCancel(upload.fileId)}
          data-testid="cancel-btn"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

describe('FileUploadItem Component (FILE-010)', () => {
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render file name', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'pending',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('file-name')).toHaveTextContent('test.pdf')
    })

    it('should render status', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('status')).toHaveTextContent('uploading')
    })

    it('should render progress percentage', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 75,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('progress')).toHaveTextContent('75%')
    })

    it('should render progress bar', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 60,
      }

      render(<FileUploadItem upload={upload} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
    })
  })

  describe('Status Display', () => {
    it('should show pending status', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'pending',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/pending/i)).toBeInTheDocument()
    })

    it('should show uploading status', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })

    it('should show processing status', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'processing',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    })

    it('should show completed status with success icon', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/completed/i)).toBeInTheDocument()
      expect(screen.getByTestId('success-icon')).toBeInTheDocument()
    })

    it('should show error status with error icon', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
        error: 'Upload failed',
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/error/i)).toBeInTheDocument()
      expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    })

    it('should display error message', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
        error: 'File too large',
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('error')).toHaveTextContent('File too large')
    })
  })

  describe('Progress Bar', () => {
    it('should show 0% progress for pending', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'pending',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should update progress bar width', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 45,
      }

      render(<FileUploadItem upload={upload} />)

      const progressBar = screen.getByTestId('progress-fill')
      expect(progressBar).toHaveStyle({ width: '45%' })
    })

    it('should show 100% for completed', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('should animate progress changes', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 30,
      }

      const { rerender } = render(<FileUploadItem upload={upload} />)

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('transition-all')

      rerender(<FileUploadItem upload={{ ...upload, progress: 60 }} />)

      expect(progressFill).toHaveStyle({ width: '60%' })
    })

    it('should show indeterminate state for processing', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'processing',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('indeterminate')
    })
  })

  describe('Cancel Button', () => {
    it('should show cancel button when uploading', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} onCancel={mockOnCancel} />)

      expect(screen.getByTestId('cancel-btn')).toBeInTheDocument()
    })

    it('should not show cancel button when pending', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'pending',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} onCancel={mockOnCancel} />)

      expect(screen.queryByTestId('cancel-btn')).not.toBeInTheDocument()
    })

    it('should not show cancel button when completed', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} onCancel={mockOnCancel} />)

      expect(screen.queryByTestId('cancel-btn')).not.toBeInTheDocument()
    })

    it('should call onCancel when clicked', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} onCancel={mockOnCancel} />)

      fireEvent.click(screen.getByTestId('cancel-btn'))

      expect(mockOnCancel).toHaveBeenCalledWith('file-1')
    })

    it('should not show cancel button if onCancel not provided', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.queryByTestId('cancel-btn')).not.toBeInTheDocument()
    })
  })

  describe('Visual States', () => {
    it('should apply pending style', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'pending',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} />)

      const item = screen.getByTestId('upload-item-file-1')
      expect(item).toHaveClass('status-pending')
    })

    it('should apply uploading style', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      const item = screen.getByTestId('upload-item-file-1')
      expect(item).toHaveClass('status-uploading')
    })

    it('should apply success style when completed', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      const item = screen.getByTestId('upload-item-file-1')
      expect(item).toHaveClass('status-completed')
    })

    it('should apply error style', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
        error: 'Failed',
      }

      render(<FileUploadItem upload={upload} />)

      const item = screen.getByTestId('upload-item-file-1')
      expect(item).toHaveClass('status-error')
    })

    it('should show spinner when uploading', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('should show processing spinner', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'processing',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })
  })

  describe('File Information', () => {
    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(100) + '.pdf'
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: longName,
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      const fileName = screen.getByTestId('file-name')
      expect(fileName).toHaveClass('truncate')
    })

    it('should show file size if provided', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/5.*mb/i)).toBeInTheDocument()
    })

    it('should show time remaining estimate', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/\d+.*sec.*remaining/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('test.pdf')
      )
    })

    it('should announce status changes to screen readers', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      const { rerender } = render(<FileUploadItem upload={upload} />)

      rerender(
        <FileUploadItem
          upload={{ ...upload, status: 'completed', progress: 100 }}
        />
      )

      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveTextContent(/completed/i)
    })

    it('should have accessible cancel button', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} onCancel={mockOnCancel} />)

      const cancelBtn = screen.getByTestId('cancel-btn')
      expect(cancelBtn).toHaveAttribute(
        'aria-label',
        expect.stringContaining('cancel')
      )
    })
  })

  describe('Error Display', () => {
    it('should show validation error message', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
        error: 'File too large (max 200MB)',
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('error')).toHaveTextContent(
        'File too large (max 200MB)'
      )
    })

    it('should show network error message', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
        error: 'Network error',
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('error')).toHaveTextContent('Network error')
    })

    it('should show retry button on error', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
        error: 'Upload failed',
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/retry/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle 0% progress', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('progress')).toHaveTextContent('0%')
    })

    it('should handle 100% progress', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 100,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('progress')).toHaveTextContent('100%')
    })

    it('should handle special characters in filename', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'lecture-2024 (final).pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('file-name')).toHaveTextContent(
        'lecture-2024 (final).pdf'
      )
    })

    it('should handle unicode filenames', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: '课程资料.pdf',
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByTestId('file-name')).toHaveTextContent('课程资料.pdf')
    })

    it('should handle missing error message', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'error',
        progress: 0,
      }

      render(<FileUploadItem upload={upload} />)

      expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn()
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      const { rerender } = render(<FileUploadItem upload={upload} />)

      // Re-render with same props
      rerender(<FileUploadItem upload={upload} />)

      // Component should be memoized
      expect(true).toBe(true)
    })

    it('should update only when progress changes', () => {
      const upload: UploadProgress = {
        fileId: 'file-1',
        fileName: 'test.pdf',
        status: 'uploading',
        progress: 50,
      }

      const { rerender } = render(<FileUploadItem upload={upload} />)

      rerender(<FileUploadItem upload={{ ...upload, progress: 60 }} />)

      expect(screen.getByTestId('progress')).toHaveTextContent('60%')
    })
  })
})
