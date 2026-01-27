import { createClient } from '@/lib/supabase/server'
import { logger } from './logger'

/**
 * PDF utility functions for analyzing and processing PDF files
 */

/**
 * Threshold for determining if a PDF is scanned
 * If text content is less than this percentage of expected content, it's considered scanned
 */
export const SCANNED_PDF_TEXT_THRESHOLD = 0.7

/**
 * PDF metadata interface
 */
export interface PdfMetadata {
  pageCount: number
  isScanned: boolean
  fileSize: number
  textContent?: string
}

/**
 * Analyze a PDF file from storage and return metadata
 * Enhanced error handling with specific error types
 * @param storagePath - The path to the PDF file in Supabase Storage
 * @returns PDF metadata including page count and scanned status
 * @throws Error with descriptive context about what failed
 */
export async function analyzePdf(storagePath: string): Promise<PdfMetadata> {
  try {
    const supabase = await createClient()

    // Download the PDF file from storage
    let data
    try {
      const downloadResult = await supabase.storage
        .from('pdfs')
        .download(storagePath)

      if (downloadResult.error) {
        throw new Error(
          `Storage download failed: ${downloadResult.error.message}`
        )
      }

      data = downloadResult.data
    } catch (error) {
      logger.error('Failed to download PDF from storage', {
        storagePath,
        error,
      })
      throw new Error(
        `Failed to download PDF from storage at path "${storagePath}": ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    if (!data) {
      const errorMsg = `PDF file not found in storage at path: ${storagePath}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    // Convert blob to buffer
    let buffer
    try {
      const arrayBuffer = await data.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (error) {
      logger.error('Failed to convert PDF blob to buffer', {
        storagePath,
        error,
      })
      throw new Error(
        `Failed to read PDF file data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Get page count
    let pageCount
    try {
      pageCount = await getPdfPageCount(buffer)
    } catch (error) {
      logger.error('Failed to get PDF page count', { storagePath, error })
      throw new Error(
        `Failed to analyze PDF structure (invalid or corrupted PDF): ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Check if PDF is scanned
    let isScanned
    try {
      isScanned = await isScannedPdf(buffer, pageCount)
    } catch (error) {
      logger.error('Failed to determine if PDF is scanned', {
        storagePath,
        error,
      })
      // Don't throw here - we can still proceed with default value
      isScanned = false
    }

    return {
      pageCount,
      isScanned,
      fileSize: buffer.length,
    }
  } catch (error) {
    // Re-throw with additional context if not already wrapped
    if (error instanceof Error && error.message.includes('Failed to')) {
      throw error
    }

    logger.error('Unexpected error analyzing PDF', { storagePath, error })
    throw new Error(
      `Unexpected error analyzing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get the page count of a PDF file
 * @param buffer - PDF file buffer
 * @returns Number of pages in the PDF
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    // Use pdf-parse to get page count
    const { PDFParse } = await import('pdf-parse')
    const pdfParser = new PDFParse({ data: new Uint8Array(buffer) })
    const data = await pdfParser.getInfo()

    return data.total
  } catch (error) {
    logger.error('Error getting PDF page count', error)
    throw new Error('Failed to get PDF page count')
  }
}

/**
 * Determine if a PDF is scanned (image-based) by analyzing text content
 * @param buffer - PDF file buffer
 * @param pageCount - Number of pages in the PDF
 * @returns True if PDF appears to be scanned (low text content)
 */
export async function isScannedPdf(
  buffer: Buffer,
  pageCount: number
): Promise<boolean> {
  try {
    // Extract text from PDF
    const textContent = await extractPdfText(buffer)

    // Calculate average text length per page
    const avgTextPerPage = textContent.length / pageCount

    // Heuristic: If average text per page is less than 100 characters,
    // it's likely a scanned PDF (images with little to no extractable text)
    // This is a simplified approach; more sophisticated OCR detection could be added
    const MIN_TEXT_PER_PAGE = 100

    return avgTextPerPage < MIN_TEXT_PER_PAGE
  } catch (error) {
    logger.error('Error determining if PDF is scanned', error)
    // If we can't determine, assume it's not scanned (safer default)
    return false
  }
}

/**
 * Extract text content from a PDF file
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse')
    const pdfParser = new PDFParse({ data: new Uint8Array(buffer) })
    const data = await pdfParser.getText()

    return data.text || ''
  } catch (error) {
    logger.error('Error extracting PDF text', error)
    throw new Error('Failed to extract PDF text')
  }
}

/**
 * Validate PDF file type
 * @param mimeType - MIME type of the file
 * @returns True if the file is a valid PDF
 */
export function isValidPdfType(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Validate PDF file size
 * @param fileSize - Size of the file in bytes
 * @param maxSize - Maximum allowed file size in bytes
 * @returns True if file size is within limits
 */
export function isValidPdfSize(fileSize: number, maxSize: number): boolean {
  return fileSize > 0 && fileSize <= maxSize
}

/**
 * Validate CUID format (starts with 'c' followed by 24 alphanumeric characters)
 * This prevents path traversal attacks by ensuring IDs are in expected format
 * @param id - ID to validate
 * @returns True if valid CUID format
 */
function isValidCuid(id: string): boolean {
  // CUID format: c[a-z0-9]{24}
  const cuidRegex = /^c[a-z0-9]{24}$/
  return cuidRegex.test(id)
}

/**
 * Generate a unique storage path for a PDF file
 * Validates userId and courseId to prevent path traversal attacks
 * @param userId - User ID (must be valid CUID)
 * @param courseId - Course ID (must be valid CUID)
 * @param fileName - Original file name
 * @returns Unique storage path
 * @throws Error if userId or courseId are not valid CUIDs
 */
export function generateStoragePath(
  userId: string,
  courseId: string,
  fileName: string
): string {
  // Validate userId format to prevent path traversal
  if (!isValidCuid(userId)) {
    throw new Error('Invalid userId format: must be a valid CUID')
  }

  // Validate courseId format to prevent path traversal
  if (!isValidCuid(courseId)) {
    throw new Error('Invalid courseId format: must be a valid CUID')
  }

  const timestamp = Date.now()
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase()

  return `${userId}/${courseId}/${timestamp}-${sanitizedFileName}`
}
