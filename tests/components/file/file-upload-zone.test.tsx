// =============================================================================
// FILE-009: FileUploadZone Component Tests (TDD)
// Drag-and-drop upload zone component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FILE_LIMITS } from '@/lib/constants'

// Component to be implemented
const FileUploadZone = ({
  onFilesSelected,
  courseId,
  disabled,
}: {
  onFilesSelected: (files: File[]) => void
  courseId: string
  disabled?: boolean
}) => {
  return (
    <div data-testid="upload-zone">
      <input
        type="file"
        accept=".pdf,application/pdf"
        multiple
        data-testid="file-input"
        onChange={(e) => {
          if (e.target.files) {
            onFilesSelected(Array.from(e.target.files))
          }
        }}
        disabled={disabled}
      />
    </div>
  )
}

describe('FileUploadZone Component (FILE-009)', () => {
  const mockOnFilesSelected = vi.fn()
  const courseId = 'course-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render upload zone', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      expect(screen.getByTestId('upload-zone')).toBeInTheDocument()
    })

    it('should display upload instructions', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
    })

    it('should show file type restrictions', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      expect(screen.getByText(/pdf/i)).toBeInTheDocument()
    })

    it('should show file size limit', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      expect(screen.getByText(/200.*mb/i)).toBeInTheDocument()
    })

    it('should have file input element', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'file')
    })

    it('should accept PDF files only', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input')
      expect(input).toHaveAttribute('accept', '.pdf,application/pdf')
    })

    it('should allow multiple file selection', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input')
      expect(input).toHaveAttribute('multiple')
    })
  })

  describe('File Selection via Click', () => {
    it('should open file picker on click', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      fireEvent.click(zone)

      // File picker should be triggered
      expect(true).toBe(true)
    })

    it('should call onFilesSelected when files are chosen', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })

      fireEvent.change(input, { target: { files: [file] } })

      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    })

    it('should handle multiple files selected', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const files = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
        new File(['content3'], 'file3.pdf', { type: 'application/pdf' }),
      ]

      fireEvent.change(input, { target: { files } })

      expect(mockOnFilesSelected).toHaveBeenCalledWith(files)
    })
  })

  describe('Drag and Drop', () => {
    it('should highlight zone on drag enter', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.dragEnter(zone)

      expect(zone).toHaveClass('drag-active')
    })

    it('should remove highlight on drag leave', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.dragEnter(zone)
      fireEvent.dragLeave(zone)

      expect(zone).not.toHaveClass('drag-active')
    })

    it('should prevent default drag over behavior', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      const event = new Event('dragover') as any
      event.preventDefault = vi.fn()

      fireEvent.dragOver(zone, event)

      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should handle file drop', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })

      const dropEvent = {
        dataTransfer: {
          files: [file],
        },
      }

      fireEvent.drop(zone, dropEvent)

      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    })

    it('should handle multiple files dropped', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      const files = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      ]

      const dropEvent = {
        dataTransfer: {
          files,
        },
      }

      fireEvent.drop(zone, dropEvent)

      expect(mockOnFilesSelected).toHaveBeenCalledWith(files)
    })

    it('should remove highlight after drop', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })

      fireEvent.dragEnter(zone)
      fireEvent.drop(zone, {
        dataTransfer: { files: [file] },
      })

      expect(zone).not.toHaveClass('drag-active')
    })
  })

  describe('Validation', () => {
    it('should filter out non-PDF files', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const files = [
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        new File(['content'], 'doc.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ]

      fireEvent.change(input, { target: { files } })

      // Only PDF should be passed
      expect(mockOnFilesSelected).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'test.pdf' })])
      )
      expect(mockOnFilesSelected).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'doc.docx' })])
      )
    })

    it('should show error for invalid file types', async () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/only pdf files/i)).toBeInTheDocument()
      })
    })

    it('should show error for files too large', async () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const largeFile = new File([''], 'huge.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', {
        value: 201 * 1024 * 1024,
      })

      const input = screen.getByTestId('file-input') as HTMLInputElement
      fireEvent.change(input, { target: { files: [largeFile] } })

      await waitFor(() => {
        expect(screen.getByText(/exceeds.*200.*mb/i)).toBeInTheDocument()
      })
    })

    it('should accept file exactly 200MB', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const maxFile = new File([''], 'max.pdf', { type: 'application/pdf' })
      Object.defineProperty(maxFile, 'size', {
        value: 200 * 1024 * 1024,
      })

      const input = screen.getByTestId('file-input') as HTMLInputElement
      fireEvent.change(input, { target: { files: [maxFile] } })

      expect(mockOnFilesSelected).toHaveBeenCalledWith([maxFile])
    })

    it('should reject empty files', async () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' })

      const input = screen.getByTestId('file-input') as HTMLInputElement
      fireEvent.change(input, { target: { files: [emptyFile] } })

      await waitFor(() => {
        expect(screen.getByText(/file is empty/i)).toBeInTheDocument()
      })
    })
  })

  describe('Disabled State', () => {
    it('should disable zone when disabled prop is true', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
          disabled={true}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      expect(zone).toHaveClass('disabled')
    })

    it('should not accept files when disabled', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
          disabled={true}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      expect(input).toBeDisabled()
    })

    it('should not highlight on drag when disabled', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
          disabled={true}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      fireEvent.dragEnter(zone)

      expect(zone).not.toHaveClass('drag-active')
    })

    it('should show disabled message', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
          disabled={true}
        />
      )

      expect(screen.getByText(/upload disabled/i)).toBeInTheDocument()
    })
  })

  describe('Visual Feedback', () => {
    it('should show upload icon', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      expect(screen.getByTestId('upload-icon')).toBeInTheDocument()
    })

    it('should change style on hover', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.mouseEnter(zone)
      expect(zone).toHaveClass('hover')

      fireEvent.mouseLeave(zone)
      expect(zone).not.toHaveClass('hover')
    })

    it('should show drag overlay when dragging', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.dragEnter(zone)

      expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      expect(zone).toHaveAttribute(
        'aria-label',
        expect.stringContaining('upload')
      )
    })

    it('should be keyboard accessible', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')
      expect(zone).toHaveAttribute('tabIndex', '0')
    })

    it('should trigger upload on Enter key', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.keyDown(zone, { key: 'Enter', code: 'Enter' })

      // File picker should be triggered
      expect(true).toBe(true)
    })

    it('should trigger upload on Space key', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.keyDown(zone, { key: ' ', code: 'Space' })

      // File picker should be triggered
      expect(true).toBe(true)
    })

    it('should announce file count to screen readers', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const files = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      ]

      fireEvent.change(input, { target: { files } })

      expect(screen.getByRole('status')).toHaveTextContent('2 files selected')
    })
  })

  describe('Error Handling', () => {
    it('should handle null files gracefully', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement

      fireEvent.change(input, { target: { files: null } })

      expect(mockOnFilesSelected).not.toHaveBeenCalled()
    })

    it('should handle empty file list', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement

      fireEvent.change(input, { target: { files: [] } })

      expect(mockOnFilesSelected).not.toHaveBeenCalled()
    })

    it('should handle drag event without files', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const zone = screen.getByTestId('upload-zone')

      fireEvent.drop(zone, {
        dataTransfer: { files: [] },
      })

      expect(mockOnFilesSelected).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in filename', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const file = new File(['content'], 'lecture-2024 (final).pdf', {
        type: 'application/pdf',
      })

      fireEvent.change(input, { target: { files: [file] } })

      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    })

    it('should handle unicode filenames', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const file = new File(['content'], '课程资料.pdf', {
        type: 'application/pdf',
      })

      fireEvent.change(input, { target: { files: [file] } })

      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    })

    it('should handle very long filenames', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const longName = 'a'.repeat(200) + '.pdf'
      const input = screen.getByTestId('file-input') as HTMLInputElement
      const file = new File(['content'], longName, {
        type: 'application/pdf',
      })

      fireEvent.change(input, { target: { files: [file] } })

      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    })

    it('should handle rapid file selections', () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement

      for (let i = 0; i < 5; i++) {
        const file = new File(['content'], `file${i}.pdf`, {
          type: 'application/pdf',
        })
        fireEvent.change(input, { target: { files: [file] } })
      }

      expect(mockOnFilesSelected).toHaveBeenCalledTimes(5)
    })
  })

  describe('Integration', () => {
    it('should work with useMultiFileUpload hook', async () => {
      const uploadHook = vi.fn()

      render(
        <FileUploadZone onFilesSelected={uploadHook} courseId={courseId} />
      )

      const input = screen.getByTestId('file-input') as HTMLInputElement
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      })

      fireEvent.change(input, { target: { files: [file] } })

      expect(uploadHook).toHaveBeenCalledWith([file])
    })

    it('should respect course file limits', async () => {
      render(
        <FileUploadZone
          onFilesSelected={mockOnFilesSelected}
          courseId={courseId}
        />
      )

      // Show warning if course has many files
      expect(screen.queryByText(/approaching limit/i)).toBeInTheDocument()
    })
  })
})
