/**
 * PDF Processing Utilities
 *
 * Provides functions for:
 * - Detecting scanned PDFs (image-only documents)
 * - Getting page counts
 * - Extracting text from specific pages
 *
 * Uses pdfjs-dist in Node.js environment (server-side).
 */

import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import { PDF } from '@/lib/constants'
import { logger } from '@/lib/logger'

// Configure PDF.js worker for Node.js environment
// Setting to empty string disables workers (runs on main thread in Node.js)
GlobalWorkerOptions.workerSrc = ''

/**
 * Type guard for TextItem objects in pdfjs-dist
 * TextItem has a 'str' property containing the text content
 */
interface TextItem {
  str: string
}

function isTextItem(item: unknown): item is TextItem {
  return typeof item === 'object' && item !== null && 'str' in item && typeof (item as TextItem).str === 'string'
}

/**
 * Detects if a PDF is likely a scanned document (image-only, no embedded text).
 *
 * Algorithm:
 * 1. Sample the first N pages (default 5, or fewer if document is smaller)
 * 2. Extract text items from each sampled page
 * 3. If a page has more than MIN_TEXT_ITEMS_THRESHOLD (50) text items, count it as having text
 * 4. If less than SCANNED_THRESHOLD_RATIO (20%) of pages have text, consider it scanned
 *
 * @param pdfBuffer - Buffer containing the PDF data
 * @returns Promise<boolean> - true if the PDF appears to be scanned, false otherwise
 *
 * @example
 * ```ts
 * const buffer = fs.readFileSync('document.pdf')
 * const isScanned = await detectScanned(buffer)
 * if (isScanned) {
 *   console.log('This PDF needs OCR processing')
 * }
 * ```
 */
export async function detectScanned(pdfBuffer: Buffer): Promise<boolean> {
  let pdfDoc: PDFDocumentProxy | null = null

  try {
    pdfDoc = await loadPdfDocument(pdfBuffer)

    // Handle empty document
    if (pdfDoc.numPages === 0) {
      logger.debug('PDF has 0 pages, treating as scanned')
      return true // Empty document is considered "scanned" (no text)
    }

    // Determine how many pages to sample
    const sampleSize = Math.min(pdfDoc.numPages, PDF.SCANNED_DETECTION_SAMPLE_SIZE)

    let pagesWithText = 0

    // Sample pages and count those with sufficient text
    for (let i = 1; i <= sampleSize; i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()

        // Count text items on this page
        const textItemCount = textContent.items.length

        // If text items exceed threshold, count this page as having text
        if (textItemCount > PDF.MIN_TEXT_ITEMS_THRESHOLD) {
          pagesWithText++
        }
      } catch (pageError) {
        // If we can't extract text from a page, treat it as no text
        logger.warn('Failed to extract text from PDF page', {
          pageNumber: i,
          error: pageError instanceof Error ? pageError.message : 'Unknown error',
        })
        continue
      }
    }

    // Calculate ratio of pages with text
    const textRatio = pagesWithText / sampleSize
    const isScanned = textRatio < PDF.SCANNED_THRESHOLD_RATIO

    logger.debug('Scanned detection complete', {
      sampleSize,
      pagesWithText,
      textRatio,
      isScanned,
    })

    // If ratio is below threshold, consider it scanned
    return isScanned
  } catch (error) {
    // On any error, default to assuming scanned (safer for OCR pipeline)
    logger.error('Failed to detect scanned PDF', error, { action: 'detectScanned' })
    return true
  } finally {
    // Clean up to prevent memory leaks
    if (pdfDoc) {
      await pdfDoc.destroy()
    }
  }
}

/**
 * Gets the total number of pages in a PDF document.
 *
 * @param pdfBuffer - Buffer containing the PDF data
 * @returns Promise<number | null> - Number of pages, or null if PDF cannot be parsed
 *
 * @example
 * ```ts
 * const buffer = fs.readFileSync('document.pdf')
 * const pageCount = await getPdfPageCount(buffer)
 * if (pageCount !== null) {
 *   console.log(`Document has ${pageCount} pages`)
 * }
 * ```
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number | null> {
  let pdfDoc: PDFDocumentProxy | null = null

  try {
    pdfDoc = await loadPdfDocument(pdfBuffer)

    // Handle undefined numPages gracefully
    if (typeof pdfDoc.numPages !== 'number') {
      logger.warn('PDF numPages is not a number', { type: typeof pdfDoc.numPages })
      return null
    }

    return pdfDoc.numPages
  } catch (error) {
    logger.error('Failed to get PDF page count', error, { action: 'getPdfPageCount' })
    return null
  } finally {
    // Clean up to prevent memory leaks
    if (pdfDoc) {
      await pdfDoc.destroy()
    }
  }
}

/**
 * Extracts text content from a specific page of a PDF document.
 *
 * @param pdfBuffer - Buffer containing the PDF data
 * @param pageNumber - 1-indexed page number to extract text from
 * @returns Promise<string | null> - Extracted text, empty string if page has no text,
 *                                   or null if page is invalid or an error occurs
 *
 * @example
 * ```ts
 * const buffer = fs.readFileSync('document.pdf')
 * const text = await extractPageText(buffer, 1)
 * if (text !== null) {
 *   console.log('First page content:', text)
 * }
 * ```
 */
export async function extractPageText(
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<string | null> {
  // Validate page number before loading document
  if (pageNumber < 1) {
    logger.warn('Invalid page number requested', { pageNumber })
    return null
  }

  let pdfDoc: PDFDocumentProxy | null = null

  try {
    pdfDoc = await loadPdfDocument(pdfBuffer)

    // Handle empty document
    if (pdfDoc.numPages === 0) {
      logger.warn('Cannot extract text from empty PDF')
      return null
    }

    // Check if page number is valid
    if (pageNumber > pdfDoc.numPages) {
      logger.warn('Page number exceeds document length', {
        pageNumber,
        totalPages: pdfDoc.numPages,
      })
      return null
    }

    const page = await pdfDoc.getPage(pageNumber)
    const textContent = await page.getTextContent()

    // Concatenate all text items using type guard
    // Filter to get only TextItem objects, then map to extract strings
    const textItems = textContent.items.filter(isTextItem) as TextItem[]
    const text = textItems.map((item) => item.str).join('')

    return text
  } catch (error) {
    logger.error('Failed to extract page text', error, {
      action: 'extractPageText',
      pageNumber,
    })
    return null
  } finally {
    // Clean up to prevent memory leaks
    if (pdfDoc) {
      await pdfDoc.destroy()
    }
  }
}

/**
 * Helper function to load a PDF document from a buffer.
 * Centralizes the document loading logic for reuse.
 *
 * @param pdfBuffer - Buffer containing the PDF data
 * @returns Promise<PDFDocumentProxy> - The loaded PDF document
 * @throws Error if the PDF cannot be parsed
 */
async function loadPdfDocument(pdfBuffer: Buffer): Promise<PDFDocumentProxy> {
  // Buffer is a subclass of Uint8Array in Node.js, so we can use it directly
  // This avoids creating a copy and doubling memory usage for large PDFs
  const loadingTask = getDocument({ data: pdfBuffer })
  const pdfDoc = await loadingTask.promise

  return pdfDoc
}
