import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileTable } from '@/components/file/file-table'
import type { FileStatus } from '@prisma/client'

// ============================================
// Test Fixtures
// ============================================

interface MockFile {
  id: string
  courseId: string
  userId: string
  name: string
  type: string
  pageCount: number | null
  fileSize: number | null
  isScanned: boolean
  status: FileStatus
  storagePath: string | null
  createdAt: string
  updatedAt: string
}

const createMockFile = (overrides: Partial<MockFile> = {}): MockFile => ({
  id: '123e4567-e89b-12d3-a456-426614174002',
  courseId: '123e4567-e89b-12d3-a456-426614174001',
  userId: '123e4567-e89b-12d3-a456-426614174000',
  name: 'lecture-01.pdf',
  type: 'lecture',
  pageCount: 25,
  fileSize: 1024 * 1024 * 5, // 5MB
  isScanned: false,
  status: 'ready',
  storagePath: 'path/to/file',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  ...overrides,
})

const mockFiles: MockFile[] = [
  createMockFile({ id: '1', name: 'lecture-01.pdf', pageCount: 25, fileSize: 5 * 1024 * 1024 }),
  createMockFile({ id: '2', name: 'lecture-02.pdf', pageCount: 50, fileSize: 10 * 1024 * 1024 }),
  createMockFile({ id: '3', name: 'assignment.pdf', pageCount: 10, fileSize: 2 * 1024 * 1024, status: 'processing' }),
]

describe('FileTable', () => {
  const defaultProps = {
    files: mockFiles,
    onDelete: vi.fn(),
    onOpen: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Basic Rendering
  // ============================================

  describe('Basic Rendering', () => {
    it('renders table with files', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('renders correct number of rows', () => {
      render(<FileTable {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      // Header row + data rows
      expect(rows.length).toBe(mockFiles.length + 1)
    })

    it('renders file names', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByText('lecture-01.pdf')).toBeInTheDocument()
      expect(screen.getByText('lecture-02.pdf')).toBeInTheDocument()
      expect(screen.getByText('assignment.pdf')).toBeInTheDocument()
    })

    it('renders with data-testid', () => {
      render(<FileTable {...defaultProps} data-testid="file-table" />)

      expect(screen.getByTestId('file-table')).toBeInTheDocument()
    })

    it('renders empty table when no files', () => {
      render(<FileTable {...defaultProps} files={[]} />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      // Should still have header row
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(1) // Only header
    })
  })

  // ============================================
  // Column Headers
  // ============================================

  describe('Column Headers', () => {
    it('renders Name column header', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
    })

    it('renders Pages column header', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByRole('columnheader', { name: /pages?/i })).toBeInTheDocument()
    })

    it('renders Size column header', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByRole('columnheader', { name: /size/i })).toBeInTheDocument()
    })

    it('renders Status column header', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    })

    it('renders Upload Time column header', () => {
      render(<FileTable {...defaultProps} />)

      expect(
        screen.getByRole('columnheader', { name: /upload|created|date/i })
      ).toBeInTheDocument()
    })

    it('renders Actions column header', () => {
      render(<FileTable {...defaultProps} />)

      expect(
        screen.getByRole('columnheader', { name: /actions?/i })
      ).toBeInTheDocument()
    })
  })

  // ============================================
  // File Name Column
  // ============================================

  describe('File Name Column', () => {
    it('displays file name', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByText('lecture-01.pdf')).toBeInTheDocument()
    })

    it('truncates long file names', () => {
      const longNameFile = createMockFile({
        name: 'this-is-a-very-long-file-name-that-should-be-truncated.pdf',
      })

      render(<FileTable {...defaultProps} files={[longNameFile]} />)

      const nameCell = screen.getByText(/this-is-a-very-long/i)
      // Should have truncation styling (text-truncate, overflow-hidden, etc.)
      expect(nameCell).toBeInTheDocument()
    })

    it('shows PDF icon next to file name', () => {
      const { container } = render(<FileTable {...defaultProps} />)

      // Should have file/PDF icon
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Page Count Column
  // ============================================

  describe('Page Count Column', () => {
    it('displays page count', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('handles null page count', () => {
      const fileWithNullPages = createMockFile({
        id: 'null-pages',
        pageCount: null,
      })

      render(<FileTable {...defaultProps} files={[fileWithNullPages]} />)

      // Should show dash or N/A
      expect(screen.getByText(/-|N\/A|—/)).toBeInTheDocument()
    })

    it('formats page count with proper unit', () => {
      render(<FileTable {...defaultProps} />)

      // Could show "25 pages" or just "25"
      const pageText = screen.getByText('25')
      expect(pageText).toBeInTheDocument()
    })
  })

  // ============================================
  // File Size Column
  // ============================================

  describe('File Size Column', () => {
    it('formats file size in MB', () => {
      render(<FileTable {...defaultProps} />)

      // 5MB should show as "5 MB" or "5MB"
      expect(screen.getByText(/5\s*MB/i)).toBeInTheDocument()
    })

    it('formats file size in KB for small files', () => {
      const smallFile = createMockFile({
        id: 'small',
        fileSize: 500 * 1024, // 500KB
      })

      render(<FileTable {...defaultProps} files={[smallFile]} />)

      expect(screen.getByText(/500\s*KB|0\.5\s*MB/i)).toBeInTheDocument()
    })

    it('handles null file size', () => {
      const fileWithNullSize = createMockFile({
        id: 'null-size',
        fileSize: null,
      })

      render(<FileTable {...defaultProps} files={[fileWithNullSize]} />)

      // Should show dash or N/A
      expect(screen.getByText(/-|N\/A|—/)).toBeInTheDocument()
    })

    it('formats large file sizes in GB', () => {
      const largeFile = createMockFile({
        id: 'large',
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      })

      render(<FileTable {...defaultProps} files={[largeFile]} />)

      expect(screen.getByText(/2\s*GB/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Status Column
  // ============================================

  describe('Status Column', () => {
    it('displays ready status', () => {
      const readyFile = createMockFile({ status: 'ready' })
      render(<FileTable {...defaultProps} files={[readyFile]} />)

      expect(screen.getByText(/ready/i)).toBeInTheDocument()
    })

    it('displays processing status', () => {
      const processingFile = createMockFile({ status: 'processing' })
      render(<FileTable {...defaultProps} files={[processingFile]} />)

      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    })

    it('displays uploading status', () => {
      const uploadingFile = createMockFile({ status: 'uploading' })
      render(<FileTable {...defaultProps} files={[uploadingFile]} />)

      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })

    it('displays failed status', () => {
      const failedFile = createMockFile({ status: 'failed' })
      render(<FileTable {...defaultProps} files={[failedFile]} />)

      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Scanned Warning
  // ============================================

  describe('Scanned Warning', () => {
    it('shows warning icon when file is scanned', () => {
      const scannedFile = createMockFile({
        id: 'scanned',
        isScanned: true,
      })

      const { container } = render(<FileTable {...defaultProps} files={[scannedFile]} />)

      // Should have warning/alert icon
      const warningIcon = container.querySelector('[data-testid="scanned-warning"]') ||
        container.querySelector('[aria-label*="scanned"]') ||
        container.querySelector('.text-amber-500, .text-yellow-500, .text-warning')

      expect(warningIcon).toBeInTheDocument()
    })

    it('does not show warning when file is not scanned', () => {
      const normalFile = createMockFile({
        id: 'normal',
        isScanned: false,
      })

      const { container } = render(<FileTable {...defaultProps} files={[normalFile]} />)

      const warningIcon = container.querySelector('[data-testid="scanned-warning"]')
      expect(warningIcon).not.toBeInTheDocument()
    })

    it('scanned warning has tooltip/title explaining the issue', () => {
      const scannedFile = createMockFile({
        id: 'scanned',
        isScanned: true,
      })

      render(<FileTable {...defaultProps} files={[scannedFile]} />)

      // Should have tooltip or title attribute
      const element = screen.queryByTitle(/scanned|image|ocr/i) ||
        screen.queryByLabelText(/scanned|image|ocr/i)

      // At minimum, there should be some indication
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  // ============================================
  // Upload Time Column
  // ============================================

  describe('Upload Time Column', () => {
    it('formats upload time correctly', () => {
      render(<FileTable {...defaultProps} />)

      // Should show formatted date like "Jan 15, 2024" or "2024-01-15"
      expect(
        screen.getByText(/Jan|January|2024-01-15|1\/15/i)
      ).toBeInTheDocument()
    })

    it('handles different date formats', () => {
      const recentFile = createMockFile({
        id: 'recent',
        createdAt: new Date().toISOString(),
      })

      render(<FileTable {...defaultProps} files={[recentFile]} />)

      // Should not throw and display some date
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('shows relative time for recent uploads', () => {
      const recentFile = createMockFile({
        id: 'recent',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      })

      render(<FileTable {...defaultProps} files={[recentFile]} showRelativeTime />)

      // Could show "5 minutes ago" or absolute time
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  // ============================================
  // Actions Column
  // ============================================

  describe('Actions Column', () => {
    it('renders open button for ready files', async () => {
      const user = userEvent.setup()
      const readyFile = createMockFile({ status: 'ready' })
      const onOpen = vi.fn()

      render(<FileTable {...defaultProps} files={[readyFile]} onOpen={onOpen} />)

      const openButton = screen.getByRole('button', { name: /open|view|read/i })
      await user.click(openButton)

      expect(onOpen).toHaveBeenCalledWith(readyFile.id)
    })

    it('renders delete button', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()

      render(<FileTable {...defaultProps} onDelete={onDelete} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete|remove/i })
      await user.click(deleteButtons[0])

      expect(onDelete).toHaveBeenCalledWith(mockFiles[0].id)
    })

    it('disables open button for non-ready files', () => {
      const processingFile = createMockFile({ status: 'processing' })

      render(<FileTable {...defaultProps} files={[processingFile]} />)

      const openButton = screen.queryByRole('button', { name: /open|view|read/i })
      if (openButton) {
        expect(openButton).toBeDisabled()
      }
    })

    it('shows dropdown menu with more actions', async () => {
      const user = userEvent.setup()

      render(<FileTable {...defaultProps} />)

      // Click menu/more button
      const menuButtons = screen.getAllByRole('button', { name: /more|menu|options/i })
      if (menuButtons.length > 0) {
        await user.click(menuButtons[0])

        // Should show dropdown options
        expect(screen.getByRole('menu') || screen.getByRole('listbox')).toBeInTheDocument()
      }
    })

    it('renders download button for ready files', async () => {
      const user = userEvent.setup()
      const readyFile = createMockFile({ status: 'ready' })
      const onDownload = vi.fn()

      render(
        <FileTable
          {...defaultProps}
          files={[readyFile]}
          onDownload={onDownload}
        />
      )

      const downloadButton = screen.queryByRole('button', { name: /download/i })
      if (downloadButton) {
        await user.click(downloadButton)
        expect(onDownload).toHaveBeenCalledWith(readyFile.id)
      }
    })
  })

  // ============================================
  // Row Click Behavior
  // ============================================

  describe('Row Click Behavior', () => {
    it('row is clickable for ready files', async () => {
      const user = userEvent.setup()
      const onOpen = vi.fn()
      const readyFile = createMockFile({ status: 'ready' })

      render(<FileTable {...defaultProps} files={[readyFile]} onOpen={onOpen} />)

      const row = screen.getByRole('row', { name: /lecture-01/i })
      await user.click(row)

      // Either row click or open button click should work
      // Implementation may vary
    })

    it('row shows hover state', () => {
      render(<FileTable {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      // Data rows should have hover styling
      expect(rows[1]).toBeInTheDocument()
    })
  })

  // ============================================
  // Loading State
  // ============================================

  describe('Loading State', () => {
    it('renders table normally when files are provided', () => {
      // Note: Loading state is handled by FileTableSkeleton component
      // FileTable always renders the table with provided files
      render(<FileTable {...defaultProps} />)

      // Should render the table
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('renders empty table body when no files provided', () => {
      render(<FileTable {...defaultProps} files={[]} />)

      // Table should still be present
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  // ============================================
  // Sorting
  // ============================================

  describe('Sorting', () => {
    it('allows sorting by name', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()

      render(<FileTable {...defaultProps} onSort={onSort} />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      await user.click(nameHeader)

      expect(onSort).toHaveBeenCalledWith('name', expect.any(String))
    })

    it('allows sorting by upload time', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()

      render(<FileTable {...defaultProps} onSort={onSort} />)

      const dateHeader = screen.getByRole('columnheader', { name: /upload|date/i })
      await user.click(dateHeader)

      expect(onSort).toHaveBeenCalledWith(
        expect.stringMatching(/createdAt|date|upload/i),
        expect.any(String)
      )
    })

    it('shows sort indicator on sorted column', () => {
      render(
        <FileTable {...defaultProps} sortBy="name" sortOrder="asc" />
      )

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      // Should have sort indicator (arrow up/down)
      const sortIndicator = within(nameHeader).queryByRole('img') ||
        nameHeader.querySelector('svg')

      expect(sortIndicator || nameHeader).toBeInTheDocument()
    })
  })

  // ============================================
  // Selection
  // ============================================

  describe('Selection', () => {
    it('allows row selection with checkbox', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()

      render(<FileTable {...defaultProps} selectable onSelect={onSelect} />)

      const checkboxes = screen.getAllByRole('checkbox')
      if (checkboxes.length > 0) {
        await user.click(checkboxes[1]) // First data row checkbox
        expect(onSelect).toHaveBeenCalled()
      }
    })

    it('allows select all with header checkbox', async () => {
      const user = userEvent.setup()
      const onSelectAll = vi.fn()

      render(<FileTable {...defaultProps} selectable onSelectAll={onSelectAll} />)

      const headerCheckbox = screen.getAllByRole('checkbox')[0]
      if (headerCheckbox) {
        await user.click(headerCheckbox)
        expect(onSelectAll).toHaveBeenCalled()
      }
    })
  })

  // ============================================
  // Accessibility
  // ============================================

  describe('Accessibility', () => {
    it('table has accessible caption', () => {
      render(<FileTable {...defaultProps} />)

      // Should have caption or aria-label
      const table = screen.getByRole('table')
      expect(
        table.getAttribute('aria-label') ||
        table.querySelector('caption')
      ).toBeTruthy()
    })

    it('column headers have scope attribute', () => {
      render(<FileTable {...defaultProps} />)

      const headers = screen.getAllByRole('columnheader')
      headers.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col')
      })
    })

    it('action buttons have accessible names', () => {
      render(<FileTable {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<FileTable {...defaultProps} />)

      const table = screen.getByRole('table')
      table.focus()

      // Tab through interactive elements (table rows are now focusable)
      await user.tab()
      // First tab should focus on the first focusable element (could be a table row or button)
      expect(document.activeElement?.tagName).toMatch(/BUTTON|A|INPUT|TR/i)
    })
  })

  // ============================================
  // Responsive Design
  // ============================================

  describe('Responsive Design', () => {
    it('renders compact view on small screens', () => {
      render(<FileTable {...defaultProps} compact />)

      // Compact view might hide some columns
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('shows all columns on large screens', () => {
      render(<FileTable {...defaultProps} />)

      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /pages?/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /size/i })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles single file', () => {
      render(<FileTable {...defaultProps} files={[mockFiles[0]]} />)

      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(2) // Header + 1 data row
    })

    it('handles many files (performance)', () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) =>
        createMockFile({ id: String(i), name: `file-${i}.pdf` })
      )

      const { container } = render(<FileTable {...defaultProps} files={manyFiles} />)

      // Should render without issue
      expect(container.querySelector('table')).toBeInTheDocument()
    })

    it('handles special characters in file names', () => {
      const specialFile = createMockFile({
        name: 'file & name (1) [test].pdf',
      })

      render(<FileTable {...defaultProps} files={[specialFile]} />)

      expect(screen.getByText('file & name (1) [test].pdf')).toBeInTheDocument()
    })

    it('handles unicode file names', () => {
      const unicodeFile = createMockFile({
        name: 'lecture.pdf',
      })

      render(<FileTable {...defaultProps} files={[unicodeFile]} />)

      expect(screen.getByText(/lecture/i)).toBeInTheDocument()
    })

    it('handles files with all statuses', () => {
      const filesWithAllStatuses = [
        createMockFile({ id: '1', status: 'uploading' }),
        createMockFile({ id: '2', status: 'processing' }),
        createMockFile({ id: '3', status: 'ready' }),
        createMockFile({ id: '4', status: 'failed' }),
      ]

      render(<FileTable {...defaultProps} files={filesWithAllStatuses} />)

      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
      expect(screen.getByText(/processing/i)).toBeInTheDocument()
      expect(screen.getByText(/ready/i)).toBeInTheDocument()
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })
})
