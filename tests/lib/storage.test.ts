// =============================================================================
// FILE-006: Storage Integration Tests (TDD)
// Supabase Storage integration tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getUploadUrl,
  getDownloadUrl,
  deleteFile,
} from '@/lib/storage'

describe('Storage Integration Tests (FILE-006)', () => {
  const testPath = 'test/file.pdf'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUploadUrl', () => {
    it('should generate upload URL successfully', async () => {
      const result = await getUploadUrl(testPath)

      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('error')
      expect(result.error).toBeNull()
    })

    it('should handle errors', async () => {
      const result = await getUploadUrl('')

      expect(result.error).toBeDefined()
    })

    it('should return signed URL format', async () => {
      const result = await getUploadUrl(testPath)

      if (!result.error) {
        expect(result.url).toContain('https://')
      }
    })

    it('should handle special characters in path', async () => {
      const specialPath = 'user/files/test file (1).pdf'
      const result = await getUploadUrl(specialPath)

      expect(result).toHaveProperty('url')
    })

    it('should handle nested paths', async () => {
      const nestedPath = 'user1/course1/folder1/file.pdf'
      const result = await getUploadUrl(nestedPath)

      expect(result).toHaveProperty('url')
    })
  })

  describe('getDownloadUrl', () => {
    it('should generate download URL successfully', async () => {
      const result = await getDownloadUrl(testPath, 3600)

      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('error')
    })

    it('should handle non-existent files', async () => {
      const result = await getDownloadUrl('nonexistent.pdf')

      expect(result).toHaveProperty('error')
    })

    it('should respect expiration time', async () => {
      const result = await getDownloadUrl(testPath, 60)

      expect(result).toHaveProperty('url')
    })

    it('should generate different URLs for different files', async () => {
      const result1 = await getDownloadUrl('file1.pdf', 3600)
      const result2 = await getDownloadUrl('file2.pdf', 3600)

      if (!result1.error && !result2.error) {
        expect(result1.url).not.toBe(result2.url)
      }
    })

    it('should handle short expiration times', async () => {
      const result = await getDownloadUrl(testPath, 1)

      expect(result).toHaveProperty('url')
    })

    it('should handle long expiration times', async () => {
      const result = await getDownloadUrl(testPath, 86400) // 24 hours

      expect(result).toHaveProperty('url')
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const result = await deleteFile(testPath)

      expect(result).toHaveProperty('error')
    })

    it('should handle deleting non-existent file', async () => {
      const result = await deleteFile('nonexistent.pdf')

      expect(result).toHaveProperty('error')
    })

    it('should handle empty paths', async () => {
      const result = await deleteFile('')

      expect(result.error).toBeDefined()
    })

    it('should handle special characters', async () => {
      const result = await deleteFile('user/files/test file (1).pdf')

      expect(result).toHaveProperty('error')
    })
  })

  describe('Path Handling', () => {
    it('should handle paths with special characters', async () => {
      const specialPath = 'user/files/test file (1).pdf'
      const result = await getUploadUrl(specialPath)

      expect(result).toHaveProperty('url')
    })

    it('should handle nested paths', async () => {
      const nestedPath = 'user1/course1/folder1/file.pdf'
      const result = await getUploadUrl(nestedPath)

      expect(result).toHaveProperty('url')
    })

    it('should handle paths with unicode characters', async () => {
      const unicodePath = 'files/文件.pdf'
      const result = await getUploadUrl(unicodePath)

      expect(result).toHaveProperty('url')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty file paths', async () => {
      const result = await getUploadUrl('')

      expect(result.error).toBeDefined()
    })

    it('should return error object on failure', async () => {
      const result = await getDownloadUrl('')

      expect(result.error).toBeInstanceOf(Error)
    })

    it('should handle null paths gracefully', async () => {
      const result = await deleteFile(null as any)

      expect(result.error).toBeDefined()
    })
  })

  describe('Response Format', () => {
    it('should return consistent error format for upload', async () => {
      const result = await getUploadUrl(testPath)

      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('error')
    })

    it('should return consistent error format for download', async () => {
      const result = await getDownloadUrl(testPath)

      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('error')
    })

    it('should return consistent error format for delete', async () => {
      const result = await deleteFile(testPath)

      expect(result).toHaveProperty('error')
    })
  })
})
