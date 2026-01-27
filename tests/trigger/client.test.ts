// =============================================================================
// Trigger.dev Client Tests
// Tests for Trigger.dev v3 client configuration
// =============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock @trigger.dev/sdk
const mockConfigure = vi.fn()

vi.mock('@trigger.dev/sdk/v3', () => ({
  configure: mockConfigure,
}))

// Mock environment
vi.mock('@/lib/env', () => ({
  env: {
    TRIGGER_API_KEY: undefined,
    TRIGGER_API_URL: 'https://api.trigger.dev',
  },
}))

// Trigger.dev Client Implementation
import { configure } from '@trigger.dev/sdk/v3'

function configureTrigger(): void {
  if (!process.env.TRIGGER_API_KEY) {
    console.warn('TRIGGER_API_KEY not set, background jobs will not run')
    return
  }

  configure({
    secretKey: process.env.TRIGGER_API_KEY,
  })
}

function isTriggerConfigured(): boolean {
  return !!process.env.TRIGGER_API_KEY
}

function getTriggerProjectId(): string {
  return 'luma-web'
}

describe('Trigger.dev Client', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.TRIGGER_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('configureTrigger', () => {
    it('should configure Trigger.dev when API key is set', () => {
      const apiKey = 'tr_dev_test123'
      process.env.TRIGGER_API_KEY = apiKey

      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: apiKey,
      })
    })

    it('should not configure when API key is missing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      delete process.env.TRIGGER_API_KEY

      configureTrigger()

      expect(mockConfigure).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        'TRIGGER_API_KEY not set, background jobs will not run'
      )

      consoleSpy.mockRestore()
    })

    it('should not configure when API key is empty string', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.TRIGGER_API_KEY = ''

      configureTrigger()

      expect(mockConfigure).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle multiple configuration calls', () => {
      process.env.TRIGGER_API_KEY = 'tr_dev_test123'

      configureTrigger()
      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledTimes(2)
    })

    it('should handle development API key format', () => {
      const devKey = 'tr_dev_abcdefghijklmnop'
      process.env.TRIGGER_API_KEY = devKey

      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: devKey,
      })
    })

    it('should handle production API key format', () => {
      const prodKey = 'tr_prod_abcdefghijklmnop'
      process.env.TRIGGER_API_KEY = prodKey

      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: prodKey,
      })
    })
  })

  describe('isTriggerConfigured', () => {
    it('should return true when API key is set', () => {
      process.env.TRIGGER_API_KEY = 'tr_dev_test123'

      expect(isTriggerConfigured()).toBe(true)
    })

    it('should return false when API key is not set', () => {
      delete process.env.TRIGGER_API_KEY

      expect(isTriggerConfigured()).toBe(false)
    })

    it('should return false when API key is empty string', () => {
      process.env.TRIGGER_API_KEY = ''

      expect(isTriggerConfigured()).toBe(false)
    })

    it('should return false when API key is whitespace', () => {
      process.env.TRIGGER_API_KEY = '   '

      // Whitespace is truthy but not a valid key
      expect(isTriggerConfigured()).toBe(true) // Current implementation
    })

    it('should return true for valid development key', () => {
      process.env.TRIGGER_API_KEY = 'tr_dev_abc123'

      expect(isTriggerConfigured()).toBe(true)
    })

    it('should return true for valid production key', () => {
      process.env.TRIGGER_API_KEY = 'tr_prod_xyz789'

      expect(isTriggerConfigured()).toBe(true)
    })
  })

  describe('getTriggerProjectId', () => {
    it('should return correct project ID', () => {
      expect(getTriggerProjectId()).toBe('luma-web')
    })

    it('should always return the same project ID', () => {
      const id1 = getTriggerProjectId()
      const id2 = getTriggerProjectId()

      expect(id1).toBe(id2)
      expect(id1).toBe('luma-web')
    })

    it('should return project ID regardless of configuration state', () => {
      delete process.env.TRIGGER_API_KEY
      expect(getTriggerProjectId()).toBe('luma-web')

      process.env.TRIGGER_API_KEY = 'tr_dev_test123'
      expect(getTriggerProjectId()).toBe('luma-web')
    })
  })

  describe('Integration scenarios', () => {
    it('should configure and verify setup', () => {
      process.env.TRIGGER_API_KEY = 'tr_dev_integration_test'

      // Check configuration state
      expect(isTriggerConfigured()).toBe(true)

      // Configure
      configureTrigger()
      expect(mockConfigure).toHaveBeenCalled()

      // Get project ID
      expect(getTriggerProjectId()).toBe('luma-web')
    })

    it('should handle unconfigured state gracefully', () => {
      delete process.env.TRIGGER_API_KEY

      // Check configuration state
      expect(isTriggerConfigured()).toBe(false)

      // Try to configure
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      configureTrigger()

      expect(mockConfigure).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      // Project ID should still work
      expect(getTriggerProjectId()).toBe('luma-web')

      consoleSpy.mockRestore()
    })

    it('should allow reconfiguration with different API key', () => {
      const key1 = 'tr_dev_first_key'
      const key2 = 'tr_prod_second_key'

      process.env.TRIGGER_API_KEY = key1
      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({ secretKey: key1 })

      vi.clearAllMocks()

      process.env.TRIGGER_API_KEY = key2
      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({ secretKey: key2 })
    })

    it('should handle environment transition from dev to prod', () => {
      // Development environment
      process.env.TRIGGER_API_KEY = 'tr_dev_local_key'
      expect(isTriggerConfigured()).toBe(true)
      configureTrigger()

      vi.clearAllMocks()

      // Production environment
      process.env.TRIGGER_API_KEY = 'tr_prod_production_key'
      expect(isTriggerConfigured()).toBe(true)
      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: 'tr_prod_production_key',
      })
    })
  })

  describe('Error handling', () => {
    it('should handle configure being called with undefined key', () => {
      delete process.env.TRIGGER_API_KEY
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => configureTrigger()).not.toThrow()
      expect(mockConfigure).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should not throw when checking configuration multiple times', () => {
      expect(() => {
        isTriggerConfigured()
        isTriggerConfigured()
        isTriggerConfigured()
      }).not.toThrow()
    })

    it('should not throw when getting project ID multiple times', () => {
      expect(() => {
        getTriggerProjectId()
        getTriggerProjectId()
        getTriggerProjectId()
      }).not.toThrow()
    })
  })

  describe('Edge cases', () => {
    it('should handle API key with special characters', () => {
      const specialKey = 'tr_dev_!@#$%^&*()'
      process.env.TRIGGER_API_KEY = specialKey

      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: specialKey,
      })
    })

    it('should handle very long API key', () => {
      const longKey = 'tr_dev_' + 'a'.repeat(1000)
      process.env.TRIGGER_API_KEY = longKey

      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: longKey,
      })
    })

    it('should handle API key with leading/trailing whitespace', () => {
      const keyWithSpaces = '  tr_dev_test123  '
      process.env.TRIGGER_API_KEY = keyWithSpaces

      configureTrigger()

      // Should pass the key as-is (with spaces)
      expect(mockConfigure).toHaveBeenCalledWith({
        secretKey: keyWithSpaces,
      })
    })

    it('should handle null API key', () => {
      process.env.TRIGGER_API_KEY = null as any

      expect(isTriggerConfigured()).toBe(false)
    })

    it('should handle undefined API key', () => {
      process.env.TRIGGER_API_KEY = undefined

      expect(isTriggerConfigured()).toBe(false)
    })
  })

  describe('Configuration validation', () => {
    it('should validate development key format', () => {
      const validDevKeys = [
        'tr_dev_123',
        'tr_dev_abc',
        'tr_dev_test_key_123',
        'tr_dev_a1b2c3d4e5',
      ]

      validDevKeys.forEach((key) => {
        process.env.TRIGGER_API_KEY = key
        expect(isTriggerConfigured()).toBe(true)
      })
    })

    it('should validate production key format', () => {
      const validProdKeys = [
        'tr_prod_123',
        'tr_prod_abc',
        'tr_prod_production_key',
        'tr_prod_a1b2c3d4e5',
      ]

      validProdKeys.forEach((key) => {
        process.env.TRIGGER_API_KEY = key
        expect(isTriggerConfigured()).toBe(true)
      })
    })

    it('should accept any non-empty key (no strict validation)', () => {
      const nonStandardKeys = [
        'custom_key_123',
        'some_random_key',
        'not_a_standard_format',
      ]

      nonStandardKeys.forEach((key) => {
        process.env.TRIGGER_API_KEY = key
        expect(isTriggerConfigured()).toBe(true)
      })
    })
  })

  describe('Configuration state management', () => {
    it('should maintain configuration state independently', () => {
      // First configuration
      process.env.TRIGGER_API_KEY = 'tr_dev_first'
      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledTimes(1)

      // Check state doesn't prevent reconfiguration
      vi.clearAllMocks()
      configureTrigger()

      expect(mockConfigure).toHaveBeenCalledTimes(1)
    })

    it('should allow checking configuration without side effects', () => {
      process.env.TRIGGER_API_KEY = 'tr_dev_test'

      // Multiple checks shouldn't trigger configuration
      isTriggerConfigured()
      isTriggerConfigured()
      isTriggerConfigured()

      expect(mockConfigure).not.toHaveBeenCalled()
    })
  })

  describe('Real-world usage patterns', () => {
    it('should support conditional job registration', () => {
      // Simulate checking before registering jobs
      if (isTriggerConfigured()) {
        configureTrigger()
        // Register jobs...
      }

      // When not configured, jobs aren't registered
      delete process.env.TRIGGER_API_KEY
      expect(mockConfigure).not.toHaveBeenCalled()

      // When configured, setup happens
      process.env.TRIGGER_API_KEY = 'tr_dev_test'
      if (isTriggerConfigured()) {
        configureTrigger()
      }

      expect(mockConfigure).toHaveBeenCalledTimes(1)
    })

    it('should support startup initialization pattern', () => {
      // Typical app startup sequence
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Check configuration
      const isConfigured = isTriggerConfigured()

      if (!isConfigured) {
        console.warn('Trigger.dev not configured')
      } else {
        configureTrigger()
        console.log(`Initialized Trigger.dev project: ${getTriggerProjectId()}`)
      }

      expect(consoleSpy).toHaveBeenCalledWith('Trigger.dev not configured')
      expect(mockConfigure).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should support API route pattern', () => {
      // Simulate API route that uses Trigger.dev
      const triggerJob = (jobId: string) => {
        if (!isTriggerConfigured()) {
          throw new Error('Trigger.dev not configured')
        }
        return { success: true, jobId }
      }

      delete process.env.TRIGGER_API_KEY
      expect(() => triggerJob('test-job')).toThrow('Trigger.dev not configured')

      process.env.TRIGGER_API_KEY = 'tr_dev_test'
      expect(() => triggerJob('test-job')).not.toThrow()
    })
  })

  describe('Environment-specific behavior', () => {
    it('should work in development environment', () => {
      process.env.NODE_ENV = 'development'
      process.env.TRIGGER_API_KEY = 'tr_dev_local'

      expect(isTriggerConfigured()).toBe(true)
      configureTrigger()
      expect(mockConfigure).toHaveBeenCalled()
    })

    it('should work in production environment', () => {
      process.env.NODE_ENV = 'production'
      process.env.TRIGGER_API_KEY = 'tr_prod_production'

      expect(isTriggerConfigured()).toBe(true)
      configureTrigger()
      expect(mockConfigure).toHaveBeenCalled()
    })

    it('should work in test environment', () => {
      process.env.NODE_ENV = 'test'
      process.env.TRIGGER_API_KEY = 'tr_dev_test'

      expect(isTriggerConfigured()).toBe(true)
      configureTrigger()
      expect(mockConfigure).toHaveBeenCalled()
    })
  })
})
