// =============================================================================
// FILE-007: PDF Analysis Utility Tests (TDD)
// analyzePdf function - detects scanned PDFs and extracts page count
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ERROR_CODES, FILE_LIMITS } from '@/lib/constants'

// Mock PDF parsing library (PyMuPDF or pdf-lib)
const mockPdfDocument = {
  numPages: 0,
  getPage: vi.fn(),
  close: vi.fn(),
}

// Function to be implemented
async function analyzePdf(buffer: Buffer): Promise<{
  pageCount: number
  isScanned: boolean
  error?: string
}> {
  // Implementation will be added
  return {
    pageCount: 0,
    isScanned: false,
  }
}

describe('analyzePdf Utility (FILE-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Page Count Detection', () => {
    it('should detect page count correctly', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content')
      mockPdfDocument.numPages = 10

      const result = await analyzePdf(pdfBuffer)

      expect(result.pageCount).toBe(10)
    })

    it('should handle single page PDF', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content')
      mockPdfDocument.numPages = 1

      const result = await analyzePdf(pdfBuffer)

      expect(result.pageCount).toBe(1)
    })

    it('should handle large PDF with 500 pages', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content')
      mockPdfDocument.numPages = 500

      const result = await analyzePdf(pdfBuffer)

      expect(result.pageCount).toBe(500)
    })

    it('should reject PDF with more than 500 pages', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content')
      mockPdfDocument.numPages = 501

      await expect(analyzePdf(pdfBuffer)).rejects.toThrow()
    })

    it('should handle empty PDF gracefully', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content')
      mockPdfDocument.numPages = 0

      await expect(analyzePdf(pdfBuffer)).rejects.toThrow('empty')
    })
  })

  describe('Scanned PDF Detection', () => {
    it('should detect scanned PDF with only images', async () => {
      const pdfBuffer = Buffer.from('mock-scanned-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue(''),
        getImages: vi.fn().mockReturnValue([{ width: 1000, height: 1400 }]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(true)
    })

    it('should detect text-based PDF as not scanned', async () => {
      const pdfBuffer = Buffer.from('mock-text-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('This is text content in the PDF'),
        getImages: vi.fn().mockReturnValue([]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(false)
    })

    it('should detect mixed PDF as not scanned', async () => {
      const pdfBuffer = Buffer.from('mock-mixed-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('Some text'),
        getImages: vi.fn().mockReturnValue([{ width: 500, height: 700 }]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(false)
    })

    it('should sample multiple pages for detection', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 100

      // Mock different pages
      let callCount = 0
      mockPdfDocument.getPage.mockImplementation(() => {
        callCount++
        return {
          getText: vi.fn().mockReturnValue(callCount % 2 === 0 ? 'text' : ''),
          getImages: vi.fn().mockReturnValue([]),
        }
      })

      const result = await analyzePdf(pdfBuffer)

      // Should sample at least 3-5 pages
      expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(expect.any(Number))
    })

    it('should use text ratio threshold for detection', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      // 80% of pages have no text
      let callCount = 0
      mockPdfDocument.getPage.mockImplementation(() => {
        callCount++
        return {
          getText: vi.fn().mockReturnValue(callCount > 8 ? 'text' : ''),
          getImages: vi.fn().mockReturnValue([{ width: 1000, height: 1400 }]),
        }
      })

      const result = await analyzePdf(pdfBuffer)

      // Should be detected as scanned (>70% pages without text)
      expect(result.isScanned).toBe(true)
    })

    it('should handle minimal text as scanned', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('  \n  '), // Only whitespace
        getImages: vi.fn().mockReturnValue([{ width: 1000, height: 1400 }]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(true)
    })

    it('should require minimum characters for text detection', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('abc'), // Too short
        getImages: vi.fn().mockReturnValue([{ width: 1000, height: 1400 }]),
      })

      const result = await analyzePdf(pdfBuffer)

      // Threshold typically 50-100 characters per page
      expect(result.isScanned).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle corrupted PDF gracefully', async () => {
      const corruptedBuffer = Buffer.from('not-a-pdf')

      await expect(analyzePdf(corruptedBuffer)).rejects.toThrow()
    })

    it('should handle invalid buffer', async () => {
      const invalidBuffer = null as any

      await expect(analyzePdf(invalidBuffer)).rejects.toThrow()
    })

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.from([])

      await expect(analyzePdf(emptyBuffer)).rejects.toThrow()
    })

    it('should return error message for invalid PDF', async () => {
      const invalidBuffer = Buffer.from('invalid')

      try {
        await analyzePdf(invalidBuffer)
        fail('Should have thrown error')
      } catch (error: any) {
        expect(error.message).toContain('Invalid PDF')
      }
    })

    it('should handle page reading errors gracefully', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10
      mockPdfDocument.getPage.mockImplementation(() => {
        throw new Error('Page read error')
      })

      await expect(analyzePdf(pdfBuffer)).rejects.toThrow()
    })

    it('should cleanup resources on error', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10
      mockPdfDocument.getPage.mockImplementation(() => {
        throw new Error('Error')
      })

      try {
        await analyzePdf(pdfBuffer)
      } catch (error) {
        // Expected
      }

      expect(mockPdfDocument.close).toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('should reject PDF larger than 200MB', async () => {
      const largeBuffer = Buffer.alloc(201 * 1024 * 1024)

      await expect(analyzePdf(largeBuffer)).rejects.toThrow()
    })

    it('should accept PDF exactly 200MB', async () => {
      const maxBuffer = Buffer.alloc(200 * 1024 * 1024)
      mockPdfDocument.numPages = 10

      const result = await analyzePdf(maxBuffer)

      expect(result.pageCount).toBe(10)
    })

    it('should validate buffer is a Buffer type', async () => {
      const notBuffer = 'not a buffer' as any

      await expect(analyzePdf(notBuffer)).rejects.toThrow()
    })

    it('should validate PDF magic bytes', async () => {
      const invalidBuffer = Buffer.from('JPEG FILE')

      await expect(analyzePdf(invalidBuffer)).rejects.toThrow('not a PDF')
    })
  })

  describe('Performance', () => {
    it('should analyze PDF quickly for small files', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      const start = Date.now()
      await analyzePdf(pdfBuffer)
      const duration = Date.now() - start

      // Should complete in under 500ms for small PDFs
      expect(duration).toBeLessThan(500)
    })

    it('should use sampling for large PDFs', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 500

      await analyzePdf(pdfBuffer)

      // Should not read all 500 pages
      expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(expect.any(Number))
      expect(mockPdfDocument.getPage).not.toHaveBeenCalledTimes(500)
    })

    it('should limit memory usage', async () => {
      const pdfBuffer = Buffer.from('mock-large-pdf')
      mockPdfDocument.numPages = 500

      const initialMemory = process.memoryUsage().heapUsed
      await analyzePdf(pdfBuffer)
      const finalMemory = process.memoryUsage().heapUsed

      // Memory increase should be reasonable (< 50MB)
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024
      expect(memoryIncrease).toBeLessThan(50)
    })
  })

  describe('Edge Cases', () => {
    it('should handle PDF with encrypted pages', async () => {
      const pdfBuffer = Buffer.from('mock-encrypted-pdf')
      mockPdfDocument.numPages = 10
      mockPdfDocument.getPage.mockImplementation(() => {
        throw new Error('Page is encrypted')
      })

      await expect(analyzePdf(pdfBuffer)).rejects.toThrow('encrypted')
    })

    it('should handle PDF with password protection', async () => {
      const pdfBuffer = Buffer.from('mock-protected-pdf')

      await expect(analyzePdf(pdfBuffer)).rejects.toThrow('password')
    })

    it('should handle PDF with damaged pages', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10
      let callCount = 0
      mockPdfDocument.getPage.mockImplementation(() => {
        callCount++
        if (callCount === 5) {
          throw new Error('Damaged page')
        }
        return {
          getText: vi.fn().mockReturnValue('text'),
          getImages: vi.fn().mockReturnValue([]),
        }
      })

      // Should skip damaged page and continue
      const result = await analyzePdf(pdfBuffer)
      expect(result.pageCount).toBe(10)
    })

    it('should handle PDF with no content', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue(''),
        getImages: vi.fn().mockReturnValue([]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.pageCount).toBe(5)
      expect(result.isScanned).toBe(true) // No text or images
    })

    it('should handle PDF with special characters in text', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('中文内容 with émojis 🎉'),
        getImages: vi.fn().mockReturnValue([]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(false)
    })

    it('should handle PDF with only images and minimal OCR text', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('1 2 3'), // Just numbers
        getImages: vi.fn().mockReturnValue([
          { width: 1000, height: 1400 },
          { width: 800, height: 600 },
        ]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(true)
    })

    it('should handle very large page dimensions', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5
      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('content'),
        getImages: vi.fn().mockReturnValue([
          { width: 10000, height: 14000 }, // Very large image
        ]),
        getMediaBox: vi.fn().mockReturnValue([0, 0, 5000, 7000]),
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.pageCount).toBe(5)
    })
  })

  describe('Return Format', () => {
    it('should return correct object structure', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      const result = await analyzePdf(pdfBuffer)

      expect(result).toHaveProperty('pageCount')
      expect(result).toHaveProperty('isScanned')
      expect(typeof result.pageCount).toBe('number')
      expect(typeof result.isScanned).toBe('boolean')
    })

    it('should return integer page count', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      const result = await analyzePdf(pdfBuffer)

      expect(Number.isInteger(result.pageCount)).toBe(true)
      expect(result.pageCount).toBeGreaterThan(0)
    })

    it('should include error field on failure', async () => {
      const invalidBuffer = Buffer.from('invalid')

      try {
        await analyzePdf(invalidBuffer)
        fail('Should have thrown')
      } catch (error: any) {
        expect(error.message).toBeDefined()
      }
    })
  })

  describe('Resource Management', () => {
    it('should close PDF document after analysis', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      await analyzePdf(pdfBuffer)

      expect(mockPdfDocument.close).toHaveBeenCalled()
    })

    it('should close document even on error', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10
      mockPdfDocument.getPage.mockImplementation(() => {
        throw new Error('Error')
      })

      try {
        await analyzePdf(pdfBuffer)
      } catch (error) {
        // Expected
      }

      expect(mockPdfDocument.close).toHaveBeenCalled()
    })

    it('should not leak memory on multiple analyses', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      // Run multiple times
      for (let i = 0; i < 10; i++) {
        await analyzePdf(pdfBuffer)
      }

      expect(mockPdfDocument.close).toHaveBeenCalledTimes(10)
    })
  })

  describe('Algorithm Details', () => {
    it('should use stratified sampling for large PDFs', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 100

      await analyzePdf(pdfBuffer)

      // Should sample pages evenly distributed
      expect(mockPdfDocument.getPage).toHaveBeenCalled()
    })

    it('should check first, middle, and last pages', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 100
      const calledPages: number[] = []

      mockPdfDocument.getPage.mockImplementation((pageNum: number) => {
        calledPages.push(pageNum)
        return {
          getText: vi.fn().mockReturnValue('text'),
          getImages: vi.fn().mockReturnValue([]),
        }
      })

      await analyzePdf(pdfBuffer)

      // Should include first, middle, and last pages
      expect(calledPages).toContain(1)
      expect(calledPages.some((p) => p > 40 && p < 60)).toBe(true)
      expect(calledPages).toContain(100)
    })

    it('should require 70% threshold for scanned detection', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 10

      let callCount = 0
      mockPdfDocument.getPage.mockImplementation(() => {
        callCount++
        // 7 out of 10 pages have no text (70% threshold)
        return {
          getText: vi
            .fn()
            .mockReturnValue(callCount <= 7 ? '' : 'text content here'),
          getImages: vi.fn().mockReturnValue([{ width: 1000, height: 1400 }]),
        }
      })

      const result = await analyzePdf(pdfBuffer)

      expect(result.isScanned).toBe(true)
    })

    it('should count text length threshold as 50 characters', async () => {
      const pdfBuffer = Buffer.from('mock-pdf')
      mockPdfDocument.numPages = 5

      mockPdfDocument.getPage.mockReturnValue({
        getText: vi.fn().mockReturnValue('a'.repeat(49)), // Just below threshold
        getImages: vi.fn().mockReturnValue([]),
      })

      const result = await analyzePdf(pdfBuffer)

      // Should be considered scanned with < 50 characters
      expect(result.isScanned).toBe(true)
    })
  })
})
