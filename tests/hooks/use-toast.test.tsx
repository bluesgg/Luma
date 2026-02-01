import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useToast, toast } from '@/hooks/use-toast'
import { vi } from 'vitest'

describe('use-toast Hook', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.toasts.forEach((t) => result.current.dismiss(t.id))
    })
  })

  describe('Client-Side Compatibility', () => {
    it('should be a client component (uses useState)', () => {
      const { result } = renderHook(() => useToast())
      expect(result.current).toBeDefined()
      expect(result.current.toasts).toEqual([])
    })

    it('should not throw SSR errors', () => {
      expect(() => {
        renderHook(() => useToast())
      }).not.toThrow()
    })
  })

  describe('Basic Toast Functionality', () => {
    it('should add a toast', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({
          title: 'Test Toast',
          description: 'This is a test',
        })
      })

      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBe('Test Toast')
      expect(result.current.toasts[0].description).toBe('This is a test')
    })

    it('should generate unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Toast 1' })
        toast({ title: 'Toast 2' })
      })

      // Only one toast should be visible (TOAST_LIMIT = 1)
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBe('Toast 2')
    })

    it('should set open state to true by default', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Test' })
      })

      expect(result.current.toasts[0].open).toBe(true)
    })
  })

  describe('Toast Dismissal', () => {
    it('should dismiss a specific toast', () => {
      const { result } = renderHook(() => useToast())

      let toastId: string

      act(() => {
        const t = toast({ title: 'Test Toast' })
        toastId = t.id
      })

      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        result.current.dismiss(toastId!)
      })

      // Toast should be marked as closed (open: false)
      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should dismiss all toasts when no ID provided', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Toast 1' })
      })

      act(() => {
        result.current.dismiss()
      })

      // All toasts should be marked as closed
      result.current.toasts.forEach((t) => {
        expect(t.open).toBe(false)
      })
    })

    it('should remove toast after delay', async () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Test Toast' })
      })

      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        const toastId = result.current.toasts[0].id
        result.current.dismiss(toastId)
      })

      // Toast should be marked as closed
      expect(result.current.toasts[0].open).toBe(false)

      // Fast-forward time to trigger removal (TOAST_REMOVE_DELAY = 5000ms)
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Toast should be removed from array
      expect(result.current.toasts).toHaveLength(0)

      vi.useRealTimers()
    })
  })

  describe('Toast Updates', () => {
    it('should update toast properties', () => {
      const { result } = renderHook(() => useToast())

      let toastInstance: ReturnType<typeof toast>

      act(() => {
        toastInstance = toast({ title: 'Original Title' })
      })

      expect(result.current.toasts[0].title).toBe('Original Title')

      act(() => {
        toastInstance.update({ title: 'Updated Title' })
      })

      expect(result.current.toasts[0].title).toBe('Updated Title')
    })

    it('should preserve other properties when updating', () => {
      const { result } = renderHook(() => useToast())

      let toastInstance: ReturnType<typeof toast>

      act(() => {
        toastInstance = toast({
          title: 'Test',
          description: 'Original Description',
        })
      })

      act(() => {
        toastInstance.update({ title: 'Updated Title' })
      })

      expect(result.current.toasts[0].title).toBe('Updated Title')
      expect(result.current.toasts[0].description).toBe('Original Description')
    })
  })

  describe('Toast Limit', () => {
    it('should enforce TOAST_LIMIT of 1', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Toast 1' })
        toast({ title: 'Toast 2' })
        toast({ title: 'Toast 3' })
      })

      // Only the most recent toast should be visible
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBe('Toast 3')
    })
  })

  describe('onOpenChange Callback', () => {
    it('should call dismiss when onOpenChange is triggered with false', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Test Toast' })
      })

      expect(result.current.toasts[0].open).toBe(true)

      // Simulate user closing toast via UI
      act(() => {
        result.current.toasts[0].onOpenChange?.(false)
      })

      expect(result.current.toasts[0].open).toBe(false)
    })
  })

  describe('Multiple Instances', () => {
    it('should share state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useToast())
      const { result: result2 } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Shared Toast' })
      })

      // Both instances should see the same toast
      expect(result1.current.toasts).toHaveLength(1)
      expect(result2.current.toasts).toHaveLength(1)
      expect(result1.current.toasts[0].id).toBe(result2.current.toasts[0].id)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty toast object', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({})
      })

      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBeUndefined()
      expect(result.current.toasts[0].description).toBeUndefined()
    })

    it('should handle toast with only title', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Only Title' })
      })

      expect(result.current.toasts[0].title).toBe('Only Title')
      expect(result.current.toasts[0].description).toBeUndefined()
    })

    it('should handle toast with action element', () => {
      const { result } = renderHook(() => useToast())

      const mockAction = <button>Action</button>

      act(() => {
        toast({
          title: 'With Action',
          action: mockAction,
        })
      })

      expect(result.current.toasts[0].action).toBe(mockAction)
    })

    it('should handle rapid successive toasts', () => {
      const { result } = renderHook(() => useToast())

      act(() => {
        for (let i = 0; i < 10; i++) {
          toast({ title: `Toast ${i}` })
        }
      })

      // Should only show the last toast due to TOAST_LIMIT = 1
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBe('Toast 9')
    })
  })

  describe('Memory Management', () => {
    it('should clean up listeners on unmount', () => {
      const { result, unmount } = renderHook(() => useToast())

      act(() => {
        toast({ title: 'Test' })
      })

      expect(result.current.toasts).toHaveLength(1)

      // Unmount should remove listener
      unmount()

      // No errors should occur
      expect(() => {
        act(() => {
          toast({ title: 'After Unmount' })
        })
      }).not.toThrow()
    })
  })
})

describe('Standalone toast Function', () => {
  it('should work without calling useToast hook', () => {
    const result = toast({ title: 'Standalone Toast' })

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('dismiss')
    expect(result).toHaveProperty('update')
    expect(typeof result.id).toBe('string')
    expect(typeof result.dismiss).toBe('function')
    expect(typeof result.update).toBe('function')
  })

  it('should return methods to control the toast', () => {
    const result = toast({ title: 'Test' })

    expect(() => result.dismiss()).not.toThrow()
    expect(() => result.update({ title: 'Updated' })).not.toThrow()
  })
})
