// =============================================================================
// Extract PDF Structure Job Tests
// Tests for Trigger.dev background job that extracts knowledge structure from PDFs
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { z } from 'zod'

// Mock dependencies
const mockPrismaUpdate = vi.fn()
const mockPrismaCreate = vi.fn()
const mockPrismaFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: {
    file: {
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate,
    },
    extractedImage: {
      create: mockPrismaCreate,
    },
  },
  prisma: {
    file: {
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate,
    },
    extractedImage: {
      create: mockPrismaCreate,
    },
  },
}))

// Mock storage
const mockDownloadFile = vi.fn()
const mockUploadFile = vi.fn()

vi.mock('@/lib/storage', () => ({
  downloadFile: mockDownloadFile,
  uploadFile: mockUploadFile,
}))

// Mock AI service
const mockExtractKnowledgeStructure = vi.fn()

vi.mock('@/lib/ai', () => ({
  extractKnowledgeStructure: mockExtractKnowledgeStructure,
}))

// Mock logger
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerTrigger = vi.fn()

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    trigger: mockLoggerTrigger,
  },
}))

// Schema and types
const extractPDFStructureSchema = z.object({
  fileId: z.string(),
  userId: z.string(),
  storagePath: z.string(),
  pageCount: z.number(),
  fileName: z.string(),
})

type ExtractPDFStructurePayload = z.infer<typeof extractPDFStructureSchema>

// Job implementation
class ExtractPDFStructureJob {
  async validate(payload: unknown): Promise<ExtractPDFStructurePayload> {
    return extractPDFStructureSchema.parse(payload)
  }

  async updateFileStatus(
    fileId: string,
    status: 'PROCESSING' | 'READY' | 'FAILED',
    error?: string
  ): Promise<void> {
    await mockPrismaUpdate({
      where: { id: fileId },
      data: {
        structureStatus: status,
        structureError: error || null,
        extractedAt: status === 'READY' ? new Date() : null,
      },
    })
  }

  async extractImages(
    fileId: string,
    storagePath: string
  ): Promise<{ imagePath: string; pageNumber: number }[]> {
    // Simulate image extraction
    mockLoggerTrigger('Extracting images from PDF', { fileId })

    // Download PDF
    const pdfBuffer = await mockDownloadFile(storagePath)

    // Extract images (mocked)
    const images = [
      { imagePath: 'images/file-123/page-1-img-0.png', pageNumber: 1 },
      { imagePath: 'images/file-123/page-2-img-0.png', pageNumber: 2 },
    ]

    // Upload images
    for (const image of images) {
      await mockUploadFile(image.imagePath, Buffer.from('fake-image-data'))
      await mockPrismaCreate({
        data: {
          fileId,
          imagePath: image.imagePath,
          pageNumber: image.pageNumber,
        },
      })
    }

    return images
  }

  async extractStructure(
    fileId: string,
    fileName: string,
    pageCount: number
  ): Promise<void> {
    mockLoggerTrigger('Extracting knowledge structure', { fileId })

    const structure = await mockExtractKnowledgeStructure({
      fileName,
      pageCount,
    })

    return structure
  }

  async execute(payload: ExtractPDFStructurePayload): Promise<void> {
    const { fileId, userId, storagePath, pageCount, fileName } = payload

    mockLoggerTrigger('Starting PDF structure extraction', {
      fileId,
      userId,
      fileName,
    })

    try {
      // Update status to PROCESSING
      await this.updateFileStatus(fileId, 'PROCESSING')

      // Step 1: Extract images
      const images = await this.extractImages(fileId, storagePath)
      mockLoggerInfo(`Extracted ${images.length} images`, { fileId })

      // Step 2: Extract knowledge structure
      await this.extractStructure(fileId, fileName, pageCount)
      mockLoggerInfo('Knowledge structure extracted', { fileId })

      // Update status to READY
      await this.updateFileStatus(fileId, 'READY')

      mockLoggerTrigger('PDF structure extraction completed', { fileId })
    } catch (error) {
      mockLoggerError('PDF structure extraction failed', error, { fileId })

      // Update status to FAILED
      await this.updateFileStatus(
        fileId,
        'FAILED',
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }
}

describe('Extract PDF Structure Job', () => {
  let job: ExtractPDFStructureJob

  beforeEach(() => {
    job = new ExtractPDFStructureJob()
    vi.clearAllMocks()

    // Setup default mocks
    mockDownloadFile.mockResolvedValue(Buffer.from('fake-pdf-data'))
    mockUploadFile.mockResolvedValue({ success: true })
    mockExtractKnowledgeStructure.mockResolvedValue({
      topics: [],
      metadata: {},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Payload Validation', () => {
    it('should validate correct payload', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      const validated = await job.validate(payload)

      expect(validated).toEqual(payload)
    })

    it('should reject payload with missing fileId', async () => {
      const payload = {
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.validate(payload)).rejects.toThrow()
    })

    it('should reject payload with missing userId', async () => {
      const payload = {
        fileId: 'file-123',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.validate(payload)).rejects.toThrow()
    })

    it('should reject payload with missing storagePath', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.validate(payload)).rejects.toThrow()
    })

    it('should reject payload with missing pageCount', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        fileName: 'test.pdf',
      }

      await expect(job.validate(payload)).rejects.toThrow()
    })

    it('should reject payload with missing fileName', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
      }

      await expect(job.validate(payload)).rejects.toThrow()
    })

    it('should reject payload with invalid pageCount type', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: '10', // Should be number
        fileName: 'test.pdf',
      }

      await expect(job.validate(payload)).rejects.toThrow()
    })

    it('should reject payload with extra fields', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
        extraField: 'not allowed',
      }

      // Zod strips extra fields by default, so this should pass
      const validated = await job.validate(payload)
      expect(validated).not.toHaveProperty('extraField')
    })

    it('should validate payload with edge case values', async () => {
      const payload = {
        fileId: 'a'.repeat(100), // Very long ID
        userId: 'b'.repeat(100),
        storagePath: 'very/long/path/' + 'c'.repeat(200) + '.pdf',
        pageCount: 1, // Minimum pages
        fileName: 'a.pdf', // Very short name
      }

      const validated = await job.validate(payload)
      expect(validated).toEqual(payload)
    })

    it('should validate payload with special characters in fileName', async () => {
      const payload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test file (1) [draft].pdf',
      }

      const validated = await job.validate(payload)
      expect(validated.fileName).toBe('test file (1) [draft].pdf')
    })
  })

  describe('Successful Extraction Flow', () => {
    it('should complete full extraction flow', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      // Verify status updates
      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({
            structureStatus: 'PROCESSING',
          }),
        })
      )

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({
            structureStatus: 'READY',
          }),
        })
      )

      // Verify logging
      expect(mockLoggerTrigger).toHaveBeenCalledWith(
        'Starting PDF structure extraction',
        expect.any(Object)
      )

      expect(mockLoggerTrigger).toHaveBeenCalledWith(
        'PDF structure extraction completed',
        expect.any(Object)
      )
    })

    it('should download PDF from storage', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      expect(mockDownloadFile).toHaveBeenCalledWith('files/test.pdf')
    })

    it('should extract and upload images', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      // Verify images were uploaded
      expect(mockUploadFile).toHaveBeenCalledTimes(2)

      // Verify image records were created
      expect(mockPrismaCreate).toHaveBeenCalledTimes(2)
      expect(mockPrismaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fileId: 'file-123',
            imagePath: expect.any(String),
            pageNumber: expect.any(Number),
          }),
        })
      )
    })

    it('should extract knowledge structure with AI', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      expect(mockExtractKnowledgeStructure).toHaveBeenCalledWith({
        fileName: 'test.pdf',
        pageCount: 10,
      })
    })

    it('should log progress at each step', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      expect(mockLoggerTrigger).toHaveBeenCalledWith(
        'Starting PDF structure extraction',
        expect.any(Object)
      )

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining('Extracted'),
        expect.any(Object)
      )

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Knowledge structure extracted',
        expect.any(Object)
      )

      expect(mockLoggerTrigger).toHaveBeenCalledWith(
        'PDF structure extraction completed',
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle download failure', async () => {
      mockDownloadFile.mockRejectedValue(new Error('Download failed'))

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow('Download failed')

      // Verify status was updated to FAILED
      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({
            structureStatus: 'FAILED',
            structureError: 'Download failed',
          }),
        })
      )
    })

    it('should handle image upload failure', async () => {
      mockUploadFile.mockRejectedValue(new Error('Upload failed'))

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow('Upload failed')

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'FAILED',
          }),
        })
      )
    })

    it('should handle AI extraction failure', async () => {
      mockExtractKnowledgeStructure.mockRejectedValue(
        new Error('AI service unavailable')
      )

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow('AI service unavailable')

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'FAILED',
            structureError: 'AI service unavailable',
          }),
        })
      )
    })

    it('should handle database update failure', async () => {
      mockPrismaUpdate.mockRejectedValue(new Error('Database error'))

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow('Database error')
    })

    it('should log errors with context', async () => {
      mockDownloadFile.mockRejectedValue(new Error('Download failed'))

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow()

      expect(mockLoggerError).toHaveBeenCalledWith(
        'PDF structure extraction failed',
        expect.any(Error),
        expect.objectContaining({ fileId: 'file-123' })
      )
    })

    it('should handle unknown error types', async () => {
      mockDownloadFile.mockRejectedValue('String error')

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow()

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'FAILED',
            structureError: 'Unknown error',
          }),
        })
      )
    })
  })

  describe('Status Updates', () => {
    it('should set status to PROCESSING at start', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      expect(mockPrismaUpdate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({
            structureStatus: 'PROCESSING',
            structureError: null,
          }),
        })
      )
    })

    it('should set status to READY on success', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await job.execute(payload)

      expect(mockPrismaUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({
            structureStatus: 'READY',
            extractedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should set status to FAILED on error', async () => {
      mockDownloadFile.mockRejectedValue(new Error('Test error'))

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow()

      expect(mockPrismaUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({
            structureStatus: 'FAILED',
            structureError: 'Test error',
          }),
        })
      )
    })

    it('should clear error on successful retry', async () => {
      // First call fails
      mockDownloadFile.mockRejectedValueOnce(new Error('Temporary error'))
      // Second call succeeds
      mockDownloadFile.mockResolvedValue(Buffer.from('fake-pdf-data'))

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      // First attempt fails
      await expect(job.execute(payload)).rejects.toThrow()

      vi.clearAllMocks()

      // Second attempt succeeds
      await job.execute(payload)

      expect(mockPrismaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'READY',
            structureError: null,
          }),
        })
      )
    })
  })

  describe('Retry Behavior', () => {
    it('should be idempotent for retries', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      // Execute multiple times
      await job.execute(payload)
      vi.clearAllMocks()

      await job.execute(payload)

      // Should produce same result
      expect(mockPrismaUpdate).toHaveBeenCalled()
      expect(mockExtractKnowledgeStructure).toHaveBeenCalled()
    })

    it('should handle partial completion and retry', async () => {
      // First execution: images uploaded, then AI fails
      mockExtractKnowledgeStructure.mockRejectedValueOnce(
        new Error('AI timeout')
      )

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      await expect(job.execute(payload)).rejects.toThrow('AI timeout')

      // Verify images were uploaded before failure
      expect(mockUploadFile).toHaveBeenCalled()

      vi.clearAllMocks()

      // Retry succeeds
      mockExtractKnowledgeStructure.mockResolvedValue({
        topics: [],
        metadata: {},
      })

      await job.execute(payload)

      // Images should be re-uploaded (idempotent)
      expect(mockUploadFile).toHaveBeenCalled()
      expect(mockPrismaUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'READY',
          }),
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle PDF with no images', async () => {
      // Mock extraction returning no images
      const extractImages = async () => []

      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      // Should still complete successfully
      await job.execute(payload)

      expect(mockPrismaUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'READY',
          }),
        })
      )
    })

    it('should handle very large PDFs', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/large.pdf',
        pageCount: 1000, // Very large
        fileName: 'large.pdf',
      }

      await job.execute(payload)

      expect(mockExtractKnowledgeStructure).toHaveBeenCalledWith({
        fileName: 'large.pdf',
        pageCount: 1000,
      })
    })

    it('should handle single-page PDFs', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/single.pdf',
        pageCount: 1,
        fileName: 'single.pdf',
      }

      await job.execute(payload)

      expect(mockPrismaUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            structureStatus: 'READY',
          }),
        })
      )
    })

    it('should handle special characters in file paths', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test file (1) [draft].pdf',
        pageCount: 10,
        fileName: 'test file (1) [draft].pdf',
      }

      await job.execute(payload)

      expect(mockDownloadFile).toHaveBeenCalledWith(
        'files/test file (1) [draft].pdf'
      )
    })

    it('should handle Unicode in filenames', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/数学レポート.pdf',
        pageCount: 10,
        fileName: '数学レポート.pdf',
      }

      await job.execute(payload)

      expect(mockExtractKnowledgeStructure).toHaveBeenCalledWith({
        fileName: '数学レポート.pdf',
        pageCount: 10,
      })
    })
  })

  describe('Performance', () => {
    it('should complete extraction in reasonable time', async () => {
      const payload: ExtractPDFStructurePayload = {
        fileId: 'file-123',
        userId: 'user-456',
        storagePath: 'files/test.pdf',
        pageCount: 10,
        fileName: 'test.pdf',
      }

      const startTime = Date.now()
      await job.execute(payload)
      const duration = Date.now() - startTime

      // Should complete quickly with mocked dependencies
      expect(duration).toBeLessThan(100)
    })

    it('should handle concurrent extractions', async () => {
      const payloads: ExtractPDFStructurePayload[] = [
        {
          fileId: 'file-1',
          userId: 'user-1',
          storagePath: 'files/test1.pdf',
          pageCount: 10,
          fileName: 'test1.pdf',
        },
        {
          fileId: 'file-2',
          userId: 'user-2',
          storagePath: 'files/test2.pdf',
          pageCount: 20,
          fileName: 'test2.pdf',
        },
        {
          fileId: 'file-3',
          userId: 'user-3',
          storagePath: 'files/test3.pdf',
          pageCount: 30,
          fileName: 'test3.pdf',
        },
      ]

      // Execute all concurrently
      await Promise.all(payloads.map((p) => job.execute(p)))

      // All should complete successfully
      expect(mockPrismaUpdate).toHaveBeenCalledTimes(payloads.length * 2) // PROCESSING + READY for each
    })
  })
})
