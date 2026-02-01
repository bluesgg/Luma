// =============================================================================
// Login Form Navigation Tests (TDD)
// Tests that login form navigates to correct page after successful login
// =============================================================================

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock use-toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('LoginForm Navigation', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Successful Login Navigation', () => {
    it('should navigate to /courses after successful login', async () => {
      // Mock successful login response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              role: 'USER',
              emailConfirmedAt: new Date().toISOString(),
            },
            message: 'Login successful',
          },
        }),
      })

      render(<LoginForm />)

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      // Wait for navigation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/courses')
      })
    })

    it('should call router.refresh() after navigation', async () => {
      // Mock successful login response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              role: 'USER',
              emailConfirmedAt: new Date().toISOString(),
            },
            message: 'Login successful',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('should navigate to /courses regardless of user role', async () => {
      // Test with ADMIN role
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'admin-user-id',
              email: 'admin@example.com',
              role: 'ADMIN',
              emailConfirmedAt: new Date().toISOString(),
            },
            message: 'Login successful',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'adminpassword' } })

      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/courses')
      })
    })

    it('should NOT navigate to / (homepage)', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              role: 'USER',
              emailConfirmedAt: new Date().toISOString(),
            },
            message: 'Login successful',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled()
      })

      // Ensure it was NOT called with '/'
      expect(mockPush).not.toHaveBeenCalledWith('/')
      expect(mockPush).toHaveBeenCalledWith('/courses')
    })
  })

  describe('Failed Login Navigation', () => {
    it('should NOT navigate when login fails', async () => {
      // Mock failed login response
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      // Wait a bit
      await waitFor(
        () => {
          expect(
            screen.getByText(/invalid email or password/i)
          ).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      // Should NOT have navigated
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should NOT navigate when network error occurs', async () => {
      // Mock network error
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      // Wait for error to appear
      await waitFor(
        () => {
          expect(
            screen.getByText(/unexpected error occurred/i)
          ).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      // Should NOT have navigated
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Navigation Timing', () => {
    it('should navigate only after successful API response', async () => {
      let resolveLogin: (value: unknown) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })

      ;(global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        loginPromise
      )

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: /log in/i })
      fireEvent.click(submitButton)

      // Navigation should NOT have happened yet
      expect(mockPush).not.toHaveBeenCalled()

      // Resolve the login
      resolveLogin!({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              role: 'USER',
              emailConfirmedAt: new Date().toISOString(),
            },
            message: 'Login successful',
          },
        }),
      })

      // Now navigation should happen
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/courses')
      })
    })
  })
})
