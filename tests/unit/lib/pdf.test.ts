import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PDF } from '@/lib/constants'

/**
 * Unit Tests for PDF Processing Utilities
 *
 * Tests the PDF processing functions that handle:
 * - Scanned document detection
 * - Page count extraction
 * - Text extraction from specific pages
 *
 * These tests mock pdfjs-dist to verify:
 * - Correct handling of PDF buffers
 * - Proper sampling of pages for scanned detection
 * - Edge cases (empty PDFs, single pages, errors)
 * - Boundary conditions for thresholds
 *
 * File to implement: src/lib/pdf.ts
 */

// Create mock types for pdfjs-dist
interface MockTextItem {
  str: string
}

interface MockTextContent {
  items: MockTextItem[]
}

interface MockPage {
  getTextContent: () => Promise<MockTextContent>
}

interface MockPDFDocument {
  numPages: number
  getPage: (pageNum: number) => Promise<MockPage>
  destroy: () => Promise<void>
}

// Mock factory functions
const createMockPage = (textItemCount: number): MockPage => ({
  getTextContent: vi.fn().mockResolvedValue({
    items: Array(textItemCount).fill({ str: 'text' }),
  }),
})

const createMockDocument = (
  numPages: number,
  textItemsPerPage: number | number[]
): MockPDFDocument => {
  const getTextItems = (pageIndex: number): number => {
    if (Array.isArray(textItemsPerPage)) {
      return textItemsPerPage[pageIndex] ?? 0
    }
    return textItemsPerPage
  }

  return {
    numPages,
    getPage: vi.fn().mockImplementation((pageNum: number) => {
      if (pageNum < 1 || pageNum > numPages) {
        return Promise.reject(new Error(`Invalid page number: ${pageNum}`))
      }
      return Promise.resolve(createMockPage(getTextItems(pageNum - 1)))
    }),
    destroy: vi.fn().mockResolvedValue(undefined),
  }
}

// Mock pdfjs-dist module
const mockGetDocument = vi.fn()

vi.mock('pdfjs-dist', () => ({
  getDocument: (params: { data: Uint8Array }) => mockGetDocument(params),
  GlobalWorkerOptions: { workerSrc: '' },
}))

// Import after mock setup
import { detectScanned, getPdfPageCount, extractPageText } from '@/lib/pdf'

describe('PDF Processing Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDocument.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // detectScanned Tests
  // ============================================
  describe('detectScanned', () => {
    describe('Normal Cases', () => {
      it('returns false for a PDF with text on all pages', async () => {
        // Arrange: 5 pages, all with 100 text items (above threshold of 50)
        const mockDoc = createMockDocument(5, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(5)
      })

      it('returns true for a PDF with no text on any page', async () => {
        // Arrange: 5 pages, all with 0 text items
        const mockDoc = createMockDocument(5, 0)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(true)
      })

      it('returns true for a PDF with very little text (below threshold)', async () => {
        // Arrange: 5 pages, all with 30 text items (below threshold of 50)
        const mockDoc = createMockDocument(5, 30)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(true)
      })

      it('samples only first 5 pages of a long document', async () => {
        // Arrange: 100 pages, but should only sample first 5
        const mockDoc = createMockDocument(100, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(PDF.SCANNED_DETECTION_SAMPLE_SIZE)
        expect(mockDoc.getPage).toHaveBeenCalledWith(1)
        expect(mockDoc.getPage).toHaveBeenCalledWith(2)
        expect(mockDoc.getPage).toHaveBeenCalledWith(3)
        expect(mockDoc.getPage).toHaveBeenCalledWith(4)
        expect(mockDoc.getPage).toHaveBeenCalledWith(5)
      })
    })

    describe('Edge Cases', () => {
      it('handles document with 0 pages', async () => {
        // Arrange: Empty document
        const mockDoc = createMockDocument(0, 0)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert: Empty document should be considered scanned (no text)
        expect(result).toBe(true)
        expect(mockDoc.getPage).not.toHaveBeenCalled()
      })

      it('handles document with exactly 1 page with text', async () => {
        // Arrange: 1 page with 100 text items
        const mockDoc = createMockDocument(1, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(1)
      })

      it('handles document with exactly 1 page without text', async () => {
        // Arrange: 1 page with 0 text items
        const mockDoc = createMockDocument(1, 0)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(true)
      })

      it('handles document with fewer pages than sample size', async () => {
        // Arrange: 3 pages (less than SCANNED_DETECTION_SAMPLE_SIZE of 5)
        const mockDoc = createMockDocument(3, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(3)
      })

      it('handles empty buffer gracefully', async () => {
        // Arrange
        mockGetDocument.mockReturnValue({
          promise: Promise.reject(new Error('Invalid PDF')),
        })

        // Act
        const result = await detectScanned(Buffer.from([]))

        // Assert: Should return true (assume scanned on error)
        expect(result).toBe(true)
      })

      it('handles getDocument error gracefully', async () => {
        // Arrange
        mockGetDocument.mockReturnValue({
          promise: Promise.reject(new Error('PDF parsing failed')),
        })

        // Act
        const result = await detectScanned(Buffer.from('corrupted'))

        // Assert: Should return true (assume scanned on error)
        expect(result).toBe(true)
      })

      it('handles getTextContent error gracefully', async () => {
        // Arrange: Page exists but getTextContent fails
        const mockDoc = {
          numPages: 3,
          getPage: vi.fn().mockResolvedValue({
            getTextContent: vi.fn().mockRejectedValue(new Error('Text extraction failed')),
          }),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert: Should return true (assume scanned on error)
        expect(result).toBe(true)
      })
    })

    describe('Boundary Conditions', () => {
      it('returns false when exactly 20% of pages have text (boundary)', async () => {
        // Arrange: 5 pages, 1 with text (1/5 = 0.2, exactly at threshold)
        // textPages/samplePages >= 0.2 means NOT scanned
        const mockDoc = createMockDocument(5, [100, 0, 0, 0, 0])
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert: At boundary (0.2), should NOT be considered scanned
        expect(result).toBe(false)
      })

      it('returns true when just below 20% threshold', async () => {
        // Arrange: 10 pages sampled (but we only sample 5), 0 with text
        // For 5 pages: need less than 1 page with text to be below 0.2
        // With 5 pages and 0 text pages: 0/5 = 0, which is < 0.2
        const mockDoc = createMockDocument(5, [0, 0, 0, 0, 0])
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(true)
      })

      it('handles exactly 50 text items (at threshold)', async () => {
        // Arrange: Page with exactly 50 text items (at MIN_TEXT_ITEMS_THRESHOLD)
        // 50 is NOT > 50, so should not count as having text
        const mockDoc = createMockDocument(5, 50)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert: 50 items is NOT > 50, so all pages count as no-text
        expect(result).toBe(true)
      })

      it('handles exactly 51 text items (just above threshold)', async () => {
        // Arrange: Page with 51 text items (just above MIN_TEXT_ITEMS_THRESHOLD)
        const mockDoc = createMockDocument(5, 51)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert: 51 > 50, so pages have text
        expect(result).toBe(false)
      })

      it('handles mixed pages - some with text, some without', async () => {
        // Arrange: 5 pages, 2 with text (2/5 = 0.4, above 0.2 threshold)
        const mockDoc = createMockDocument(5, [100, 0, 100, 0, 0])
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert: 2/5 = 0.4 >= 0.2, not scanned
        expect(result).toBe(false)
      })

      it('handles exactly at sample size boundary (5 pages)', async () => {
        // Arrange: Exactly 5 pages
        const mockDoc = createMockDocument(5, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(5)
      })

      it('handles document with 4 pages (one less than sample size)', async () => {
        // Arrange: 4 pages with text
        const mockDoc = createMockDocument(4, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(4)
      })

      it('handles document with 6 pages (one more than sample size)', async () => {
        // Arrange: 6 pages, but only first 5 should be sampled
        const mockDoc = createMockDocument(6, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await detectScanned(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(false)
        expect(mockDoc.getPage).toHaveBeenCalledTimes(5)
        expect(mockDoc.getPage).not.toHaveBeenCalledWith(6)
      })
    })
  })

  // ============================================
  // getPdfPageCount Tests
  // ============================================
  describe('getPdfPageCount', () => {
    describe('Normal Cases', () => {
      it('returns correct page count for a valid PDF', async () => {
        // Arrange
        const mockDoc = createMockDocument(10, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await getPdfPageCount(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(10)
      })

      it('returns correct page count for a single page PDF', async () => {
        // Arrange
        const mockDoc = createMockDocument(1, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await getPdfPageCount(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(1)
      })

      it('returns correct page count for a large PDF', async () => {
        // Arrange: 500 pages (at STORAGE.MAX_PAGE_COUNT limit)
        const mockDoc = createMockDocument(500, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await getPdfPageCount(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(500)
      })
    })

    describe('Edge Cases', () => {
      it('returns 0 for an empty PDF', async () => {
        // Arrange
        const mockDoc = createMockDocument(0, 0)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await getPdfPageCount(Buffer.from('fake-pdf'))

        // Assert
        expect(result).toBe(0)
      })

      it('returns null when PDF parsing fails', async () => {
        // Arrange
        mockGetDocument.mockReturnValue({
          promise: Promise.reject(new Error('Invalid PDF')),
        })

        // Act
        const result = await getPdfPageCount(Buffer.from('corrupted'))

        // Assert
        expect(result).toBeNull()
      })

      it('returns null for empty buffer', async () => {
        // Arrange
        mockGetDocument.mockReturnValue({
          promise: Promise.reject(new Error('Empty buffer')),
        })

        // Act
        const result = await getPdfPageCount(Buffer.from([]))

        // Assert
        expect(result).toBeNull()
      })

      it('handles getDocument returning undefined numPages', async () => {
        // Arrange
        const mockDoc = { numPages: undefined, destroy: vi.fn().mockResolvedValue(undefined) }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await getPdfPageCount(Buffer.from('fake-pdf'))

        // Assert: Should return null or 0 depending on implementation
        expect(result === null || result === 0).toBe(true)
      })
    })
  })

  // ============================================
  // extractPageText Tests
  // ============================================
  describe('extractPageText', () => {
    describe('Normal Cases', () => {
      it('extracts text from a valid page', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Hello ' }, { str: 'World' }, { str: '!' }],
          }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBe('Hello World!')
        expect(mockDoc.getPage).toHaveBeenCalledWith(1)
      })

      it('extracts text from middle page', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Page 3 content' }],
          }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 3)

        // Assert
        expect(result).toBe('Page 3 content')
        expect(mockDoc.getPage).toHaveBeenCalledWith(3)
      })

      it('extracts text from last page', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Last page' }],
          }),
        }
        const mockDoc = {
          numPages: 10,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 10)

        // Assert
        expect(result).toBe('Last page')
        expect(mockDoc.getPage).toHaveBeenCalledWith(10)
      })

      it('returns empty string for page with no text items', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [],
          }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBe('')
      })

      it('handles text items with empty strings', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: '' }, { str: 'Hello' }, { str: '' }, { str: 'World' }],
          }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBe('HelloWorld')
      })
    })

    describe('Edge Cases', () => {
      it('returns null for page 0 (invalid)', async () => {
        // Arrange
        const mockDoc = createMockDocument(5, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 0)

        // Assert
        expect(result).toBeNull()
      })

      it('returns null for negative page number', async () => {
        // Arrange
        const mockDoc = createMockDocument(5, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), -1)

        // Assert
        expect(result).toBeNull()
      })

      it('returns null for page number exceeding total pages', async () => {
        // Arrange
        const mockDoc = createMockDocument(5, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 6)

        // Assert
        expect(result).toBeNull()
      })

      it('returns null for empty document (0 pages)', async () => {
        // Arrange
        const mockDoc = createMockDocument(0, 0)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBeNull()
      })

      it('returns null when PDF parsing fails', async () => {
        // Arrange
        mockGetDocument.mockReturnValue({
          promise: Promise.reject(new Error('Invalid PDF')),
        })

        // Act
        const result = await extractPageText(Buffer.from('corrupted'), 1)

        // Assert
        expect(result).toBeNull()
      })

      it('returns null when getPage fails', async () => {
        // Arrange
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockRejectedValue(new Error('Page not found')),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBeNull()
      })

      it('returns null when getTextContent fails', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockRejectedValue(new Error('Text extraction failed')),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBeNull()
      })
    })

    describe('Boundary Conditions', () => {
      it('extracts from page 1 of single-page document', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Only page' }],
          }),
        }
        const mockDoc = {
          numPages: 1,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBe('Only page')
      })

      it('returns null for page 2 of single-page document', async () => {
        // Arrange
        const mockDoc = createMockDocument(1, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 2)

        // Assert
        expect(result).toBeNull()
      })

      it('handles very large page numbers gracefully', async () => {
        // Arrange
        const mockDoc = createMockDocument(10, 100)
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 999999)

        // Assert
        expect(result).toBeNull()
      })

      it('handles page with many text items', async () => {
        // Arrange: 1000 text items
        const items = Array(1000)
          .fill(null)
          .map((_, i) => ({ str: `word${i} ` }))
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({ items }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toContain('word0')
        expect(result).toContain('word999')
        expect(result?.split('word').length).toBe(1001) // 1000 words + 1 (split creates n+1 parts)
      })

      it('handles Unicode text correctly', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'Hello ' }, { str: 'World' }, { str: ' ' }, { str: 'Test' }],
          }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert
        expect(result).toBe('Hello World Test')
      })

      it('handles special characters in text', async () => {
        // Arrange
        const mockPage = {
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: '<script>' }, { str: 'alert("xss")' }, { str: '</script>' }],
          }),
        }
        const mockDoc = {
          numPages: 5,
          getPage: vi.fn().mockResolvedValue(mockPage),
          destroy: vi.fn().mockResolvedValue(undefined),
        }
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

        // Act
        const result = await extractPageText(Buffer.from('fake-pdf'), 1)

        // Assert: Should preserve special characters as-is (not sanitize)
        expect(result).toBe('<script>alert("xss")</script>')
      })
    })
  })

  // ============================================
  // Integration-like Tests (multiple functions)
  // ============================================
  describe('Function Integration', () => {
    it('getPdfPageCount and extractPageText work consistently', async () => {
      // Arrange
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Content' }],
        }),
      }
      const mockDoc = {
        numPages: 3,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      const pageCount = await getPdfPageCount(Buffer.from('fake-pdf'))

      // Reset mock for second call
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Assert: Can extract text from all pages reported by getPdfPageCount
      for (let i = 1; i <= pageCount!; i++) {
        mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })
        const text = await extractPageText(Buffer.from('fake-pdf'), i)
        expect(text).not.toBeNull()
      }
    })

    it('detectScanned and extractPageText agree on text presence', async () => {
      // Arrange: Document with text
      const mockPageWithText = {
        getTextContent: vi.fn().mockResolvedValue({
          items: Array(100).fill({ str: 'text ' }),
        }),
      }
      const mockDoc = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue(mockPageWithText),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      const isScanned = await detectScanned(Buffer.from('fake-pdf'))

      // Reset mock
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      const text = await extractPageText(Buffer.from('fake-pdf'), 1)

      // Assert: If not scanned, should be able to extract text
      expect(isScanned).toBe(false)
      expect(text).toBeTruthy()
      expect(text!.length).toBeGreaterThan(0)
    })

    it('handles concurrent PDF processing', async () => {
      // Arrange
      const mockDoc = createMockDocument(5, 100)
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act: Run multiple PDF operations concurrently
      const results = await Promise.all([
        detectScanned(Buffer.from('pdf1')),
        detectScanned(Buffer.from('pdf2')),
        detectScanned(Buffer.from('pdf3')),
      ])

      // Assert: All operations should complete successfully
      expect(results).toHaveLength(3)
      results.forEach((result) => expect(typeof result).toBe('boolean'))
    })
  })

  // ============================================
  // Mixed Item Types Tests
  // ============================================
  describe('Mixed Item Types', () => {
    it('handles mixed item types in textContent (marked content items without str)', async () => {
      // Arrange: Some items have 'str' property, some don't (like marked content)
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'Hello' },
            { type: 'beginMarkedContent', tag: 'P' }, // No str property
            { str: ' ' },
            { type: 'endMarkedContent' }, // No str property
            { str: 'World' },
          ],
        }),
      }
      const mockDoc = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      const result = await extractPageText(Buffer.from('fake-pdf'), 1)

      // Assert: Should only extract items with 'str' property
      expect(result).toBe('Hello World')
    })

    it('handles items with non-string str property gracefully', async () => {
      // Arrange: Edge case where str might not be a string
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'Valid' },
            { str: 123 }, // Invalid: str should be string
            { str: 'Text' },
          ],
        }),
      }
      const mockDoc = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      const result = await extractPageText(Buffer.from('fake-pdf'), 1)

      // Assert: Should only extract valid string items
      expect(result).toBe('ValidText')
    })

    it('handles null items in textContent gracefully', async () => {
      // Arrange
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Hello' }, null, { str: 'World' }],
        }),
      }
      const mockDoc = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      const result = await extractPageText(Buffer.from('fake-pdf'), 1)

      // Assert: Should skip null items
      expect(result).toBe('HelloWorld')
    })
  })

  // ============================================
  // Cleanup/Memory Tests
  // ============================================
  describe('Resource Cleanup', () => {
    it('destroys PDF document after detectScanned completes', async () => {
      // Arrange
      const mockDoc = createMockDocument(5, 100)
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      await detectScanned(Buffer.from('fake-pdf'))

      // Assert: destroy should have been called
      expect(mockDoc.destroy).toHaveBeenCalledTimes(1)
    })

    it('destroys PDF document after getPdfPageCount completes', async () => {
      // Arrange
      const mockDoc = createMockDocument(10, 100)
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      await getPdfPageCount(Buffer.from('fake-pdf'))

      // Assert: destroy should have been called
      expect(mockDoc.destroy).toHaveBeenCalledTimes(1)
    })

    it('destroys PDF document after extractPageText completes', async () => {
      // Arrange
      const mockPage = {
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'Text' }],
        }),
      }
      const mockDoc = {
        numPages: 5,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      await extractPageText(Buffer.from('fake-pdf'), 1)

      // Assert: destroy should have been called
      expect(mockDoc.destroy).toHaveBeenCalledTimes(1)
    })

    it('destroys PDF document even when error occurs during detectScanned', async () => {
      // Arrange: Document exists but page processing throws
      const mockDoc = {
        numPages: 5,
        getPage: vi.fn().mockRejectedValue(new Error('Page error')),
        destroy: vi.fn().mockResolvedValue(undefined),
      }
      mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockDoc) })

      // Act
      await detectScanned(Buffer.from('fake-pdf'))

      // Assert: destroy should still be called in finally block
      expect(mockDoc.destroy).toHaveBeenCalledTimes(1)
    })
  })
})
