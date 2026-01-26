import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FileUploadItem } from '@/components/file/file-upload-item'
import type { UploadItem } from '@/hooks/use-multi-file-upload'

describe('FileUploadItem', () => {
  const mockFile = new File(['content'], 'test-document.pdf', {
    type: 'application/pdf',
  })

  const baseItem: UploadItem = {
    id: 'test-id-123',
    file: mockFile,
    status: 'pending',
    progress: 0,
    retries: 0,
  }

  const mockHandlers = {
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // TEST 1: Status Rendering - Pending
  // ============================================
  describe('pending status', () => {
    it('displays pending state with file name', () => {
      render(<FileUploadItem item={baseItem} {...mockHandlers} />)

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      expect(screen.getByText(/waiting/i)).toBeInTheDocument()
    })

    it('shows file size in pending state', () => {
      const fileWithSize = new File(['x'.repeat(1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      })
      Object.defineProperty(fileWithSize, 'size', {
        value: 5 * 1024 * 1024, // 5MB
        writable: false,
      })

      const item = { ...baseItem, file: fileWithSize }
      render(<FileUploadItem item={item} {...mockHandlers} />)

      expect(screen.getByText(/5(\.\d+)?\s*MB/i)).toBeInTheDocument()
    })

    it('renders cancel button in pending state', () => {
      render(<FileUploadItem item={baseItem} {...mockHandlers} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('calls onCancel when cancel button clicked in pending state', () => {
      render(<FileUploadItem item={baseItem} {...mockHandlers} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockHandlers.onCancel).toHaveBeenCalledWith('test-id-123')
      expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // TEST 2: Status Rendering - Uploading
  // ============================================
  describe('uploading status', () => {
    it('displays uploading state with progress bar', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 45,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('displays correct progress percentage', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 67,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      expect(screen.getByText('67%')).toBeInTheDocument()
    })

    it('updates progress bar value attribute', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 82,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '82')
    })

    it('renders cancel button during upload', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('calls onCancel when cancel clicked during upload', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockHandlers.onCancel).toHaveBeenCalledWith('test-id-123')
    })
  })

  // ============================================
  // TEST 3: Status Rendering - Processing
  // ============================================
  describe('processing status', () => {
    it('displays processing state', () => {
      const processingItem: UploadItem = {
        ...baseItem,
        status: 'processing',
        progress: 100,
      }

      render(<FileUploadItem item={processingItem} {...mockHandlers} />)

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    })

    it('shows spinner during processing', () => {
      const processingItem: UploadItem = {
        ...baseItem,
        status: 'processing',
        progress: 100,
      }

      render(<FileUploadItem item={processingItem} {...mockHandlers} />)

      const spinner = screen.getByTestId('processing-spinner')
      expect(spinner).toBeInTheDocument()
    })

    it('does not show action buttons during processing', () => {
      const processingItem: UploadItem = {
        ...baseItem,
        status: 'processing',
        progress: 100,
      }

      render(<FileUploadItem item={processingItem} {...mockHandlers} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 4: Status Rendering - Completed
  // ============================================
  describe('completed status', () => {
    it('displays completed state with success indicator', () => {
      const completedItem: UploadItem = {
        ...baseItem,
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem item={completedItem} {...mockHandlers} />)

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      expect(screen.getByText(/complete/i)).toBeInTheDocument()
    })

    it('shows checkmark icon for completed upload', () => {
      const completedItem: UploadItem = {
        ...baseItem,
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem item={completedItem} {...mockHandlers} />)

      const checkmark = screen.getByTestId('success-icon')
      expect(checkmark).toBeInTheDocument()
    })

    it('renders remove button for completed upload', () => {
      const completedItem: UploadItem = {
        ...baseItem,
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem item={completedItem} {...mockHandlers} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('calls onRemove when remove button clicked', () => {
      const completedItem: UploadItem = {
        ...baseItem,
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem item={completedItem} {...mockHandlers} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)

      expect(mockHandlers.onRemove).toHaveBeenCalledWith('test-id-123')
      expect(mockHandlers.onRemove).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // TEST 5: Status Rendering - Failed
  // ============================================
  describe('failed status', () => {
    it('displays failed state with error message', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Network connection lost',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
      expect(screen.getByText('Network connection lost')).toBeInTheDocument()
    })

    it('shows error icon for failed upload', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Upload failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const errorIcon = screen.getByTestId('error-icon')
      expect(errorIcon).toBeInTheDocument()
    })

    it('renders retry button for failed upload', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Upload failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('renders remove button for failed upload', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Upload failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Upload failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(mockHandlers.onRetry).toHaveBeenCalledWith('test-id-123')
      expect(mockHandlers.onRetry).toHaveBeenCalledTimes(1)
    })

    it('calls onRemove when remove button clicked for failed upload', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Upload failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)

      expect(mockHandlers.onRemove).toHaveBeenCalledWith('test-id-123')
    })

    it('shows retry count when retries have occurred', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Upload failed',
        retries: 2,
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      expect(screen.getByText(/attempt 2/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 6: File Size Display
  // ============================================
  describe('file size formatting', () => {
    it('displays size in bytes for small files', () => {
      const smallFile = new File(['x'], 'tiny.pdf', { type: 'application/pdf' })
      Object.defineProperty(smallFile, 'size', { value: 512, writable: false })

      const item = { ...baseItem, file: smallFile }
      render(<FileUploadItem item={item} {...mockHandlers} />)

      expect(screen.getByText(/512\s*B/i)).toBeInTheDocument()
    })

    it('displays size in KB for medium files', () => {
      const mediumFile = new File(['x'], 'medium.pdf', { type: 'application/pdf' })
      Object.defineProperty(mediumFile, 'size', {
        value: 256 * 1024, // 256KB
        writable: false,
      })

      const item = { ...baseItem, file: mediumFile }
      render(<FileUploadItem item={item} {...mockHandlers} />)

      expect(screen.getByText(/256(\.\d+)?\s*KB/i)).toBeInTheDocument()
    })

    it('displays size in MB for large files', () => {
      const largeFile = new File(['x'], 'large.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', {
        value: 50 * 1024 * 1024, // 50MB
        writable: false,
      })

      const item = { ...baseItem, file: largeFile }
      render(<FileUploadItem item={item} {...mockHandlers} />)

      expect(screen.getByText(/50(\.\d+)?\s*MB/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 7: Accessibility
  // ============================================
  describe('accessibility', () => {
    it('has proper ARIA labels for progress bar', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 55,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '55')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('announces status changes to screen readers', () => {
      const { rerender } = render(<FileUploadItem item={baseItem} {...mockHandlers} />)

      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')

      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 50,
      }

      rerender(<FileUploadItem item={uploadingItem} {...mockHandlers} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible button labels', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toHaveAccessibleName()

      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toHaveAccessibleName()
    })

    it('provides alt text for status icons', () => {
      const completedItem: UploadItem = {
        ...baseItem,
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem item={completedItem} {...mockHandlers} />)

      const icon = screen.getByTestId('success-icon')
      expect(icon).toHaveAttribute('aria-label')
    })

    it('truncates long file names with ellipsis', () => {
      const longNameFile = new File(['content'], 'a'.repeat(100) + '.pdf', {
        type: 'application/pdf',
      })

      const item = { ...baseItem, file: longNameFile }
      render(<FileUploadItem item={item} {...mockHandlers} />)

      const fileName = screen.getByText(longNameFile.name)
      const styles = window.getComputedStyle(fileName)
      expect(styles.textOverflow).toBe('ellipsis')
    })

    it('has keyboard accessible action buttons', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      retryButton.focus()
      expect(retryButton).toHaveFocus()

      fireEvent.keyDown(retryButton, { key: 'Enter' })
      expect(mockHandlers.onRetry).toHaveBeenCalled()
    })
  })

  // ============================================
  // TEST 8: Visual States
  // ============================================
  describe('visual states', () => {
    it('applies pending visual styling', () => {
      render(<FileUploadItem item={baseItem} {...mockHandlers} />)

      const container = screen.getByTestId('upload-item')
      expect(container).toHaveClass('border-slate-200')
    })

    it('applies uploading visual styling', () => {
      const uploadingItem: UploadItem = {
        ...baseItem,
        status: 'uploading',
        progress: 50,
      }

      render(<FileUploadItem item={uploadingItem} {...mockHandlers} />)

      const container = screen.getByTestId('upload-item')
      expect(container).toHaveClass('border-indigo-300')
    })

    it('applies completed visual styling', () => {
      const completedItem: UploadItem = {
        ...baseItem,
        status: 'completed',
        progress: 100,
      }

      render(<FileUploadItem item={completedItem} {...mockHandlers} />)

      const container = screen.getByTestId('upload-item')
      expect(container).toHaveClass('border-green-200')
    })

    it('applies failed visual styling', () => {
      const failedItem: UploadItem = {
        ...baseItem,
        status: 'failed',
        error: 'Failed',
      }

      render(<FileUploadItem item={failedItem} {...mockHandlers} />)

      const container = screen.getByTestId('upload-item')
      expect(container).toHaveClass('border-red-200')
    })
  })
})
