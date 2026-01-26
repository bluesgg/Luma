import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileUploader } from '@/components/file/file-uploader'
import { STORAGE } from '@/lib/constants'
import userEvent from '@testing-library/user-event'

// Mock the hook
vi.mock('@/hooks/use-multi-file-upload', () => ({
  useMultiFileUpload: vi.fn(),
}))

import { useMultiFileUpload } from '@/hooks/use-multi-file-upload'

describe('FileUploader', () => {
  const mockCourseId = '123e4567-e89b-12d3-a456-426614174000'
  const mockCsrfToken = 'mock-csrf-token'

  const mockHookReturn = {
    queue: [],
    stats: {
      total: 0,
      pending: 0,
      uploading: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    },
    addFiles: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    remove: vi.fn(),
    clearAll: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useMultiFileUpload as any).mockReturnValue(mockHookReturn)
  })

  // ============================================
  // TEST 1: Drag and Drop File Validation
  // ============================================
  describe('drag and drop', () => {
    it('renders drop zone by default', () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument()
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    })

    it('accepts PDF files via drag and drop', async () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const dropZone = screen.getByTestId('file-upload-zone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      const dataTransfer = {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
      }

      fireEvent.dragEnter(dropZone, { dataTransfer })
      fireEvent.dragOver(dropZone, { dataTransfer })
      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(mockHookReturn.addFiles).toHaveBeenCalledWith([file])
      })
    })

    it('highlights drop zone on drag over', () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const dropZone = screen.getByTestId('file-upload-zone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.dragEnter(dropZone, {
        dataTransfer: { files: [file] },
      })

      expect(dropZone).toHaveClass('border-indigo-500')
    })

    it('removes highlight on drag leave', () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const dropZone = screen.getByTestId('file-upload-zone')

      fireEvent.dragEnter(dropZone)
      fireEvent.dragLeave(dropZone)

      expect(dropZone).not.toHaveClass('border-indigo-500')
    })

    it('accepts multiple files in single drop', async () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const dropZone = screen.getByTestId('file-upload-zone')
      const files = [
        new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
        new File(['c3'], 'test3.pdf', { type: 'application/pdf' }),
      ]

      fireEvent.drop(dropZone, {
        dataTransfer: { files },
      })

      await waitFor(() => {
        expect(mockHookReturn.addFiles).toHaveBeenCalledWith(files)
      })
    })
  })

  // ============================================
  // TEST 2: File Picker Multi-Select
  // ============================================
  describe('file picker', () => {
    it('opens file picker on browse button click', async () => {
      const user = userEvent.setup()
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const browseButton = screen.getByRole('button', { name: /browse/i })
      await user.click(browseButton)

      // Hidden file input should be triggered
      const fileInput = screen.getByLabelText(/upload pdf file/i)
      expect(fileInput).toBeInTheDocument()
    })

    it('accepts PDF file from file picker', async () => {
      const user = userEvent.setup()
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const fileInput = screen.getByLabelText(/upload pdf file/i) as HTMLInputElement
      const file = new File(['content'], 'selected.pdf', { type: 'application/pdf' })

      await user.upload(fileInput, file)

      expect(mockHookReturn.addFiles).toHaveBeenCalledWith([file])
    })

    it('accepts multiple files from file picker', async () => {
      const user = userEvent.setup()
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const fileInput = screen.getByLabelText(/upload pdf file/i) as HTMLInputElement
      const files = [
        new File(['c1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['c2'], 'file2.pdf', { type: 'application/pdf' }),
      ]

      await user.upload(fileInput, files)

      expect(mockHookReturn.addFiles).toHaveBeenCalledWith(files)
    })

    it('restricts file picker to PDF files only', () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const fileInput = screen.getByLabelText(/upload pdf file/i)
      expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf')
    })

    it('allows multiple file selection', () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const fileInput = screen.getByLabelText(/upload pdf file/i)
      expect(fileInput).toHaveAttribute('multiple')
    })
  })

  // ============================================
  // TEST 3: Invalid File Error Display
  // ============================================
  describe('file validation errors', () => {
    it('displays error for non-PDF file', () => {
      const invalidFile = {
        id: 'invalid-1',
        file: new File(['content'], 'document.txt', { type: 'text/plain' }),
        status: 'failed' as const,
        progress: 0,
        retries: 0,
        error: 'Only PDF files are allowed',
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [invalidFile],
        stats: { ...mockHookReturn.stats, total: 1, failed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText(/only pdf files are allowed/i)).toBeInTheDocument()
    })

    it('displays error for file exceeding 200MB', () => {
      const largeFile = {
        id: 'large-1',
        file: new File(['x'], 'huge.pdf', { type: 'application/pdf' }),
        status: 'failed' as const,
        progress: 0,
        retries: 0,
        error: 'File size exceeds the 200 MB limit',
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [largeFile],
        stats: { ...mockHookReturn.stats, total: 1, failed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText(/200 mb limit/i)).toBeInTheDocument()
    })

    it('displays error when at file limit', () => {
      const limitError = {
        id: 'limit-1',
        file: new File(['c'], 'test.pdf', { type: 'application/pdf' }),
        status: 'failed' as const,
        progress: 0,
        retries: 0,
        error: 'Cannot exceed maximum of 30 files per course',
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [limitError],
        stats: { ...mockHookReturn.stats, total: 1, failed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText(/maximum of 30 files/i)).toBeInTheDocument()
    })

    it('displays multiple errors for multiple invalid files', () => {
      const invalidFiles = [
        {
          id: 'invalid-1',
          file: new File(['c'], 'doc.txt', { type: 'text/plain' }),
          status: 'failed' as const,
          progress: 0,
          retries: 0,
          error: 'Only PDF files are allowed',
        },
        {
          id: 'invalid-2',
          file: new File(['x'], 'large.pdf', { type: 'application/pdf' }),
          status: 'failed' as const,
          progress: 0,
          retries: 0,
          error: 'File size exceeds the 200 MB limit',
        },
      ]

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: invalidFiles,
        stats: { ...mockHookReturn.stats, total: 2, failed: 2 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText(/only pdf files are allowed/i)).toBeInTheDocument()
      expect(screen.getByText(/200 mb limit/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 4: Upload Queue Display
  // ============================================
  describe('upload queue', () => {
    it('hides drop zone when files are uploading', () => {
      const uploadingFile = {
        id: 'upload-1',
        file: new File(['c'], 'test.pdf', { type: 'application/pdf' }),
        status: 'uploading' as const,
        progress: 50,
        retries: 0,
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [uploadingFile],
        stats: { ...mockHookReturn.stats, total: 1, uploading: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.queryByText(/drag and drop/i)).not.toBeInTheDocument()
    })

    it('displays upload queue when files are present', () => {
      const queuedFiles = [
        {
          id: 'file-1',
          file: new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
          status: 'pending' as const,
          progress: 0,
          retries: 0,
        },
        {
          id: 'file-2',
          file: new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
          status: 'uploading' as const,
          progress: 45,
          retries: 0,
        },
      ]

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: queuedFiles,
        stats: { ...mockHookReturn.stats, total: 2, pending: 1, uploading: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByTestId('upload-queue')).toBeInTheDocument()
      expect(screen.getByText('test1.pdf')).toBeInTheDocument()
      expect(screen.getByText('test2.pdf')).toBeInTheDocument()
    })

    it('displays queue with all status types', () => {
      const mixedQueue = [
        {
          id: 'pending-1',
          file: new File(['c1'], 'pending.pdf', { type: 'application/pdf' }),
          status: 'pending' as const,
          progress: 0,
          retries: 0,
        },
        {
          id: 'uploading-1',
          file: new File(['c2'], 'uploading.pdf', { type: 'application/pdf' }),
          status: 'uploading' as const,
          progress: 60,
          retries: 0,
        },
        {
          id: 'processing-1',
          file: new File(['c3'], 'processing.pdf', { type: 'application/pdf' }),
          status: 'processing' as const,
          progress: 100,
          retries: 0,
        },
        {
          id: 'completed-1',
          file: new File(['c4'], 'completed.pdf', { type: 'application/pdf' }),
          status: 'completed' as const,
          progress: 100,
          retries: 0,
        },
        {
          id: 'failed-1',
          file: new File(['c5'], 'failed.pdf', { type: 'application/pdf' }),
          status: 'failed' as const,
          progress: 0,
          retries: 2,
          error: 'Upload failed',
        },
      ]

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: mixedQueue,
        stats: {
          total: 5,
          pending: 1,
          uploading: 1,
          processing: 1,
          completed: 1,
          failed: 1,
        },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText('pending.pdf')).toBeInTheDocument()
      expect(screen.getByText('uploading.pdf')).toBeInTheDocument()
      expect(screen.getByText('processing.pdf')).toBeInTheDocument()
      expect(screen.getByText('completed.pdf')).toBeInTheDocument()
      expect(screen.getByText('failed.pdf')).toBeInTheDocument()
    })

    it('orders queue items correctly', () => {
      const orderedQueue = [
        {
          id: 'first',
          file: new File(['c1'], 'first.pdf', { type: 'application/pdf' }),
          status: 'uploading' as const,
          progress: 50,
          retries: 0,
        },
        {
          id: 'second',
          file: new File(['c2'], 'second.pdf', { type: 'application/pdf' }),
          status: 'pending' as const,
          progress: 0,
          retries: 0,
        },
      ]

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: orderedQueue,
        stats: { ...mockHookReturn.stats, total: 2, uploading: 1, pending: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const items = screen.getAllByTestId('upload-item')
      expect(within(items[0]).getByText('first.pdf')).toBeInTheDocument()
      expect(within(items[1]).getByText('second.pdf')).toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 5: Progress Updates
  // ============================================
  describe('progress updates', () => {
    it('displays overall progress summary', () => {
      const queue = [
        {
          id: 'file-1',
          file: new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
          status: 'uploading' as const,
          progress: 50,
          retries: 0,
        },
        {
          id: 'file-2',
          file: new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
          status: 'completed' as const,
          progress: 100,
          retries: 0,
        },
        {
          id: 'file-3',
          file: new File(['c3'], 'test3.pdf', { type: 'application/pdf' }),
          status: 'pending' as const,
          progress: 0,
          retries: 0,
        },
      ]

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue,
        stats: { total: 3, pending: 1, uploading: 1, processing: 0, completed: 1, failed: 0 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText(/1 of 3 completed/i)).toBeInTheDocument()
    })

    it('updates progress as uploads complete', () => {
      const { rerender } = render(
        <FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />
      )

      // Initial state: 2 uploading
      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [
          {
            id: 'f1',
            file: new File(['c1'], 't1.pdf', { type: 'application/pdf' }),
            status: 'uploading' as const,
            progress: 30,
            retries: 0,
          },
          {
            id: 'f2',
            file: new File(['c2'], 't2.pdf', { type: 'application/pdf' }),
            status: 'uploading' as const,
            progress: 70,
            retries: 0,
          },
        ],
        stats: { total: 2, pending: 0, uploading: 2, processing: 0, completed: 0, failed: 0 },
      })

      rerender(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)
      expect(screen.getByText(/0 of 2 completed/i)).toBeInTheDocument()

      // First file completes
      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [
          {
            id: 'f1',
            file: new File(['c1'], 't1.pdf', { type: 'application/pdf' }),
            status: 'completed' as const,
            progress: 100,
            retries: 0,
          },
          {
            id: 'f2',
            file: new File(['c2'], 't2.pdf', { type: 'application/pdf' }),
            status: 'uploading' as const,
            progress: 90,
            retries: 0,
          },
        ],
        stats: { total: 2, pending: 0, uploading: 1, processing: 0, completed: 1, failed: 0 },
      })

      rerender(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)
      expect(screen.getByText(/1 of 2 completed/i)).toBeInTheDocument()
    })

    it('shows uploading count', () => {
      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [
          {
            id: 'f1',
            file: new File(['c'], 't.pdf', { type: 'application/pdf' }),
            status: 'uploading' as const,
            progress: 50,
            retries: 0,
          },
        ],
        stats: { total: 1, pending: 0, uploading: 1, processing: 0, completed: 0, failed: 0 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 6: Action Button Functionality
  // ============================================
  describe('action buttons', () => {
    it('calls cancel handler when cancel clicked', () => {
      const uploadingFile = {
        id: 'upload-1',
        file: new File(['c'], 'test.pdf', { type: 'application/pdf' }),
        status: 'uploading' as const,
        progress: 50,
        retries: 0,
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [uploadingFile],
        stats: { ...mockHookReturn.stats, total: 1, uploading: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockHookReturn.cancel).toHaveBeenCalledWith('upload-1')
    })

    it('calls retry handler when retry clicked', () => {
      const failedFile = {
        id: 'failed-1',
        file: new File(['c'], 'test.pdf', { type: 'application/pdf' }),
        status: 'failed' as const,
        progress: 0,
        retries: 2,
        error: 'Upload failed',
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [failedFile],
        stats: { ...mockHookReturn.stats, total: 1, failed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(mockHookReturn.retry).toHaveBeenCalledWith('failed-1')
    })

    it('calls remove handler when remove clicked', () => {
      const completedFile = {
        id: 'completed-1',
        file: new File(['c'], 'test.pdf', { type: 'application/pdf' }),
        status: 'completed' as const,
        progress: 100,
        retries: 0,
      }

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [completedFile],
        stats: { ...mockHookReturn.stats, total: 1, completed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      fireEvent.click(removeButton)

      expect(mockHookReturn.remove).toHaveBeenCalledWith('completed-1')
    })

    it('calls clearAll when clear all button clicked', () => {
      const queue = [
        {
          id: 'completed-1',
          file: new File(['c1'], 'test1.pdf', { type: 'application/pdf' }),
          status: 'completed' as const,
          progress: 100,
          retries: 0,
        },
        {
          id: 'failed-1',
          file: new File(['c2'], 'test2.pdf', { type: 'application/pdf' }),
          status: 'failed' as const,
          progress: 0,
          retries: 3,
          error: 'Failed',
        },
      ]

      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue,
        stats: { total: 2, pending: 0, uploading: 0, processing: 0, completed: 1, failed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      const clearButton = screen.getByRole('button', { name: /clear all/i })
      fireEvent.click(clearButton)

      expect(mockHookReturn.clearAll).toHaveBeenCalled()
    })

    it('does not show clear all button when queue is empty', () => {
      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 7: Disabled State at File Limit
  // ============================================
  describe('file limit behavior', () => {
    it('disables drop zone when at 30 file limit', () => {
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      const dropZone = screen.getByTestId('file-upload-zone')
      expect(dropZone).toHaveAttribute('aria-disabled', 'true')
    })

    it('disables browse button when at limit', () => {
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      const browseButton = screen.getByRole('button', { name: /browse/i })
      expect(browseButton).toBeDisabled()
    })

    it('shows warning when approaching limit (5 files remaining)', () => {
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE - 5}
        />
      )

      expect(screen.getByText(/5 files remaining/i)).toBeInTheDocument()
    })

    it('shows warning when 1 file remaining', () => {
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE - 1}
        />
      )

      expect(screen.getByText(/1 file remaining/i)).toBeInTheDocument()
    })

    it('shows no remaining files message at limit', () => {
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      expect(screen.getByText(/no files remaining/i)).toBeInTheDocument()
    })

    it('does not accept files when at limit', async () => {
      const user = userEvent.setup()
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      const fileInput = screen.getByLabelText(/upload pdf file/i) as HTMLInputElement
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      expect(fileInput).toBeDisabled()
    })

    it('allows adding files when below limit', () => {
      render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={10}
        />
      )

      const dropZone = screen.getByTestId('file-upload-zone')
      expect(dropZone).toHaveAttribute('aria-disabled', 'false')
    })

    it('updates remaining count as files are added', () => {
      const { rerender } = render(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={25}
        />
      )

      expect(screen.getByText(/5 files remaining/i)).toBeInTheDocument()

      rerender(
        <FileUploader
          courseId={mockCourseId}
          csrfToken={mockCsrfToken}
          currentFileCount={28}
        />
      )

      expect(screen.getByText(/2 files remaining/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // TEST 8: Integration - Full Upload Flow
  // ============================================
  describe('full upload flow', () => {
    it('handles complete upload lifecycle', async () => {
      const user = userEvent.setup()

      // Start with empty queue
      const { rerender } = render(
        <FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />
      )

      // User selects file
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })
      const fileInput = screen.getByLabelText(/upload pdf file/i) as HTMLInputElement

      await user.upload(fileInput, file)
      expect(mockHookReturn.addFiles).toHaveBeenCalledWith([file])

      // File starts uploading
      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [
          {
            id: 'file-1',
            file,
            status: 'uploading' as const,
            progress: 50,
            retries: 0,
          },
        ],
        stats: { total: 1, pending: 0, uploading: 1, processing: 0, completed: 0, failed: 0 },
      })

      rerender(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()

      // File completes
      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [
          {
            id: 'file-1',
            file,
            status: 'completed' as const,
            progress: 100,
            retries: 0,
          },
        ],
        stats: { total: 1, pending: 0, uploading: 0, processing: 0, completed: 1, failed: 0 },
      })

      rerender(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)
      expect(screen.getByText(/complete/i)).toBeInTheDocument()

      // User removes completed file
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(mockHookReturn.remove).toHaveBeenCalledWith('file-1')
    })

    it('handles upload failure and retry', async () => {
      const user = userEvent.setup()

      // File fails
      ;(useMultiFileUpload as any).mockReturnValue({
        ...mockHookReturn,
        queue: [
          {
            id: 'file-1',
            file: new File(['c'], 'failed.pdf', { type: 'application/pdf' }),
            status: 'failed' as const,
            progress: 0,
            retries: 1,
            error: 'Network error',
          },
        ],
        stats: { total: 1, pending: 0, uploading: 0, processing: 0, completed: 0, failed: 1 },
      })

      render(<FileUploader courseId={mockCourseId} csrfToken={mockCsrfToken} />)

      expect(screen.getByText('Network error')).toBeInTheDocument()

      // User retries
      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(mockHookReturn.retry).toHaveBeenCalledWith('file-1')
    })
  })
})
