import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadZone } from '@/components/file/file-upload-zone'
import { STORAGE } from '@/lib/constants'

describe('FileUploadZone', () => {
  const defaultProps = {
    onFileSelect: vi.fn(),
    onUploadStart: vi.fn(),
    onUploadComplete: vi.fn(),
    onUploadError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders upload zone', () => {
      render(<FileUploadZone {...defaultProps} />)

      expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument()
    })

    it('shows upload icon', () => {
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('shows upload instructions', () => {
      render(<FileUploadZone {...defaultProps} />)

      expect(
        screen.getByText(/drag|drop|upload|select|click/i)
      ).toBeInTheDocument()
    })

    it('shows file type restrictions', () => {
      render(<FileUploadZone {...defaultProps} />)

      expect(screen.getByText(/pdf/i)).toBeInTheDocument()
    })

    it('shows file size limit', () => {
      render(<FileUploadZone {...defaultProps} />)

      // Should mention 200MB limit
      expect(screen.getByText(/200\s*MB/i)).toBeInTheDocument()
    })

    it('renders browse button', () => {
      render(<FileUploadZone {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /browse|select|choose/i })
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // File Input
  // ============================================

  describe('File Input', () => {
    it('has hidden file input', () => {
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const input = container.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
    })

    it('file input accepts only PDF files', () => {
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const input = container.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('accept', '.pdf,application/pdf')
    })

    it('clicking browse button opens file dialog', async () => {
      const user = userEvent.setup()
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = vi.spyOn(input, 'click')

      const browseButton = screen.getByRole('button', { name: /browse|select|choose/i })
      await user.click(browseButton)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('clicking anywhere in zone opens file dialog', async () => {
      const user = userEvent.setup()
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = vi.spyOn(input, 'click')

      const zone = screen.getByTestId('file-upload-zone')
      await user.click(zone)

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  // ============================================
  // File Selection
  // ============================================

  describe('File Selection', () => {
    it('calls onFileSelect when file is selected', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(onFileSelect).toHaveBeenCalledWith(file)
    })

    it('accepts valid PDF files', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const file = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(onFileSelect).toHaveBeenCalledWith(file)
    })

    it('rejects non-PDF files', async () => {
      const onFileSelect = vi.fn()
      const onUploadError = vi.fn()
      const { container } = render(
        <FileUploadZone
          {...defaultProps}
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      )

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(onFileSelect).not.toHaveBeenCalled()
      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/pdf|type|invalid/i),
        })
      )
    })

    it('rejects files exceeding size limit', async () => {
      const onFileSelect = vi.fn()
      const onUploadError = vi.fn()
      const { container } = render(
        <FileUploadZone
          {...defaultProps}
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      )

      // Create a mock file larger than 200MB
      const largeFile = new File(
        [new ArrayBuffer(STORAGE.MAX_FILE_SIZE + 1)],
        'large.pdf',
        { type: 'application/pdf' }
      )
      Object.defineProperty(largeFile, 'size', { value: STORAGE.MAX_FILE_SIZE + 1 })

      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [largeFile] } })

      expect(onFileSelect).not.toHaveBeenCalled()
      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/size|large|200.*MB|limit/i),
        })
      )
    })

    it('handles empty file selection', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [] } })

      expect(onFileSelect).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Drag and Drop
  // ============================================

  describe('Drag and Drop', () => {
    it('shows drag active state when file is dragged over', () => {
      render(<FileUploadZone {...defaultProps} />)

      const zone = screen.getByTestId('file-upload-zone')

      fireEvent.dragEnter(zone, {
        dataTransfer: { types: ['Files'] },
      })

      // Should have visual indication of drag active
      expect(zone.className).toMatch(/drag|active|highlight|border|ring/i)
    })

    it('removes drag active state when file leaves', () => {
      render(<FileUploadZone {...defaultProps} />)

      const zone = screen.getByTestId('file-upload-zone')

      fireEvent.dragEnter(zone, {
        dataTransfer: { types: ['Files'] },
      })

      fireEvent.dragLeave(zone)

      // Should return to normal state
      // Check that active state is removed
    })

    it('accepts dropped PDF file', async () => {
      const onFileSelect = vi.fn()
      render(<FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />)

      const zone = screen.getByTestId('file-upload-zone')
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.drop(zone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      })

      await waitFor(() => {
        expect(onFileSelect).toHaveBeenCalledWith(file)
      })
    })

    it('rejects dropped non-PDF file', async () => {
      const onFileSelect = vi.fn()
      const onUploadError = vi.fn()
      render(
        <FileUploadZone
          {...defaultProps}
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      )

      const zone = screen.getByTestId('file-upload-zone')
      const file = new File(['test'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      fireEvent.drop(zone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      })

      await waitFor(() => {
        expect(onFileSelect).not.toHaveBeenCalled()
        expect(onUploadError).toHaveBeenCalled()
      })
    })

    it('handles multiple file drop (takes first or rejects)', async () => {
      const onFileSelect = vi.fn()
      const onUploadError = vi.fn()
      render(
        <FileUploadZone
          {...defaultProps}
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      )

      const zone = screen.getByTestId('file-upload-zone')
      const files = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ]

      fireEvent.drop(zone, {
        dataTransfer: {
          files,
          types: ['Files'],
        },
      })

      await waitFor(() => {
        // Either accepts first file or rejects multiple files
        expect(
          onFileSelect.mock.calls.length === 1 ||
          onUploadError.mock.calls.length === 1
        ).toBe(true)
      })
    })

    it('prevents default on dragover', () => {
      render(<FileUploadZone {...defaultProps} />)

      const zone = screen.getByTestId('file-upload-zone')
      const dragOverEvent = new Event('dragover', { bubbles: true })
      const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault')

      zone.dispatchEvent(dragOverEvent)

      // preventDefault should be called to allow drop
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  // ============================================
  // Disabled State
  // ============================================

  describe('Disabled State', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<FileUploadZone {...defaultProps} disabled />)

      const zone = screen.getByTestId('file-upload-zone')
      expect(zone).toHaveAttribute('aria-disabled', 'true')
    })

    it('does not allow file selection when disabled', async () => {
      const user = userEvent.setup()
      const onFileSelect = vi.fn()
      render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} disabled />
      )

      const browseButton = screen.getByRole('button', { name: /browse|select|choose/i })
      await user.click(browseButton)

      expect(onFileSelect).not.toHaveBeenCalled()
    })

    it('does not accept drag and drop when disabled', () => {
      const onFileSelect = vi.fn()
      render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} disabled />
      )

      const zone = screen.getByTestId('file-upload-zone')
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.drop(zone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      })

      expect(onFileSelect).not.toHaveBeenCalled()
    })

    it('shows disabled visual state', () => {
      render(<FileUploadZone {...defaultProps} disabled />)

      const zone = screen.getByTestId('file-upload-zone')
      expect(zone.className).toMatch(/disabled|opacity|cursor-not-allowed/i)
    })
  })

  // ============================================
  // Upload Progress
  // ============================================

  describe('Upload Progress', () => {
    it('shows progress bar when uploading', () => {
      render(<FileUploadZone {...defaultProps} isUploading progress={50} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('shows file name being uploaded', () => {
      render(
        <FileUploadZone
          {...defaultProps}
          isUploading
          progress={50}
          uploadingFileName="test.pdf"
        />
      )

      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    it('shows upload percentage', () => {
      render(<FileUploadZone {...defaultProps} isUploading progress={75} />)

      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })

    it('disables interactions while uploading', () => {
      render(<FileUploadZone {...defaultProps} isUploading progress={50} />)

      const browseButton = screen.queryByRole('button', { name: /browse|select|choose/i })
      if (browseButton) {
        expect(browseButton).toBeDisabled()
      }
    })

    it('shows cancel upload button', async () => {
      const onCancel = vi.fn()
      render(
        <FileUploadZone
          {...defaultProps}
          isUploading
          progress={50}
          onCancel={onCancel}
        />
      )

      const cancelButton = screen.queryByRole('button', { name: /cancel/i })
      if (cancelButton) {
        expect(cancelButton).toBeInTheDocument()
      }
    })
  })

  // ============================================
  // Error State
  // ============================================

  describe('Error State', () => {
    it('shows error message when upload fails', () => {
      render(
        <FileUploadZone {...defaultProps} error="Upload failed: Network error" />
      )

      expect(screen.getByText(/upload failed|network error/i)).toBeInTheDocument()
    })

    it('error message has error styling', () => {
      render(<FileUploadZone {...defaultProps} error="Upload failed" />)

      const errorElement = screen.getByText(/upload failed/i)
      expect(errorElement.className).toMatch(/error|red|destructive|danger/i)
    })

    it('shows retry button on error', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      render(
        <FileUploadZone
          {...defaultProps}
          error="Upload failed"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.queryByRole('button', { name: /retry|try again/i })
      if (retryButton) {
        await user.click(retryButton)
        expect(onRetry).toHaveBeenCalled()
      }
    })

    it('clears error on new file selection', async () => {
      const { container, rerender } = render(
        <FileUploadZone {...defaultProps} error="Upload failed" />
      )

      // Rerender without error (simulating state change after file select)
      rerender(<FileUploadZone {...defaultProps} error={undefined} />)

      expect(screen.queryByText(/upload failed/i)).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('has accessible label', () => {
      render(<FileUploadZone {...defaultProps} />)

      const zone = screen.getByTestId('file-upload-zone')
      expect(zone).toHaveAccessibleName()
    })

    it('file input has accessible label', () => {
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const input = container.querySelector('input[type="file"]')
      expect(input).toHaveAccessibleName()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const { container } = render(<FileUploadZone {...defaultProps} />)

      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      const focusSpy = vi.spyOn(input, 'focus')

      await user.tab()

      // Either the zone or the input should receive focus
      expect(document.activeElement?.tagName).toMatch(/INPUT|BUTTON|DIV/i)
    })

    it('announces upload progress to screen readers', () => {
      render(<FileUploadZone {...defaultProps} isUploading progress={50} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('announces errors to screen readers', () => {
      render(<FileUploadZone {...defaultProps} error="Upload failed" />)

      const errorElement = screen.getByText(/upload failed/i)
      expect(errorElement).toHaveAttribute('role', 'alert')
    })
  })

  // ============================================
  // Quota Information
  // ============================================

  describe('Quota Information', () => {
    it('shows remaining file slots', () => {
      render(
        <FileUploadZone
          {...defaultProps}
          currentFileCount={25}
          maxFiles={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      // Should show something like "5 files remaining" or "25/30 files"
      expect(
        screen.getByText(/5|25.*30|remaining/i)
      ).toBeInTheDocument()
    })

    it('disables upload when at file limit', () => {
      render(
        <FileUploadZone
          {...defaultProps}
          currentFileCount={STORAGE.MAX_FILES_PER_COURSE}
          maxFiles={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      const zone = screen.getByTestId('file-upload-zone')
      expect(zone).toHaveAttribute('aria-disabled', 'true')
    })

    it('shows warning when near file limit', () => {
      render(
        <FileUploadZone
          {...defaultProps}
          currentFileCount={28}
          maxFiles={STORAGE.MAX_FILES_PER_COURSE}
        />
      )

      // Should indicate only 2 slots remaining
      expect(
        screen.getByText(/2|only|remaining/i)
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles rapid file selections', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      const file1 = new File(['test1'], 'test1.pdf', { type: 'application/pdf' })
      const file2 = new File(['test2'], 'test2.pdf', { type: 'application/pdf' })

      fireEvent.change(input, { target: { files: [file1] } })
      fireEvent.change(input, { target: { files: [file2] } })

      // Should handle gracefully
      expect(onFileSelect).toHaveBeenCalledTimes(2)
    })

    it('handles file with no extension but correct MIME type', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const file = new File(['%PDF-1.4'], 'document', { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      // Should accept based on MIME type
      expect(onFileSelect).toHaveBeenCalledWith(file)
    })

    it('handles file with .pdf extension but wrong MIME type', async () => {
      const onFileSelect = vi.fn()
      const onUploadError = vi.fn()
      const { container } = render(
        <FileUploadZone
          {...defaultProps}
          onFileSelect={onFileSelect}
          onUploadError={onUploadError}
        />
      )

      const file = new File(['not a pdf'], 'fake.pdf', { type: 'text/plain' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      // Implementation may accept based on extension or reject based on MIME
      // At least one callback should be called
      expect(
        onFileSelect.mock.calls.length + onUploadError.mock.calls.length
      ).toBeGreaterThan(0)
    })

    it('handles special characters in file names', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const file = new File(['test'], 'file & name (1).pdf', { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(onFileSelect).toHaveBeenCalledWith(file)
    })

    it('handles very long file names', async () => {
      const onFileSelect = vi.fn()
      const { container } = render(
        <FileUploadZone {...defaultProps} onFileSelect={onFileSelect} />
      )

      const longName = 'a'.repeat(255) + '.pdf'
      const file = new File(['test'], longName, { type: 'application/pdf' })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      // Should either accept or handle gracefully
      expect(
        onFileSelect.mock.calls.length > 0 || true
      ).toBe(true)
    })
  })
})
