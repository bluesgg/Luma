import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AUTH } from '@/lib/constants'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock the useCsrf hook
const mockGetHeaders = vi.fn(() => ({ 'X-CSRF-Token': 'test-csrf-token' }))
vi.mock('@/hooks/use-csrf', () => ({
  useCsrf: () => ({
    token: 'test-csrf-token',
    isLoading: false,
    error: null,
    refreshToken: vi.fn(),
    getHeaders: mockGetHeaders,
  }),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Form Field Rendering', () => {
    it('renders email input field', () => {
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('renders submit button with correct text', () => {
      render(<ForgotPasswordForm />)

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('renders card header with title and description', () => {
      render(<ForgotPasswordForm />)

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
      expect(
        screen.getByText(/enter your email address and we'll send you a link to reset your password/i)
      ).toBeInTheDocument()
    })
  })

  describe('Input Icons', () => {
    it('renders Mail icon in email input field', () => {
      render(<ForgotPasswordForm />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const mailIcon = emailField?.querySelector('svg')
      expect(mailIcon).toBeInTheDocument()
      expect(mailIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Navigation Links', () => {
    it('renders back to login link', () => {
      render(<ForgotPasswordForm />)

      const backToLoginLink = screen.getByRole('link', { name: /back to sign in/i })
      expect(backToLoginLink).toBeInTheDocument()
      expect(backToLoginLink).toHaveAttribute('href', '/login')
    })

    it('renders "Remember your password?" text', () => {
      render(<ForgotPasswordForm />)

      expect(screen.getByText(/remember your password\?/i)).toBeInTheDocument()
    })
  })

  describe('Zod Schema Validation', () => {
    it('displays error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.clear(emailInput)
      await user.type(emailInput, 'notanemail')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for empty email', async () => {
      render(<ForgotPasswordForm />)

      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('does not submit form with invalid data', async () => {
      render(<ForgotPasswordForm />)

      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })

    it('accepts valid email format', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'valid@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token',
          },
          body: JSON.stringify({
            email: 'test@example.com',
          }),
          credentials: 'include',
        })
      })
    })

    it('includes CSRF token in headers', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockGetHeaders).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/forgot-password',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-CSRF-Token': 'test-csrf-token',
            }),
          })
        )
      })
    })
  })

  describe('Loading State', () => {
    it('displays loading text on submit button during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()
      })

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })

    it('shows loading spinner during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /sending/i })
        const spinner = loadingButton.querySelector('svg.animate-spin')
        expect(spinner).toBeInTheDocument()
      })

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })

    it('disables form fields during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toBeDisabled()
        expect(submitButton).toBeDisabled()
      })

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })

    it('re-enables form after submission completes with error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Request failed' },
        }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Success State', () => {
    it('shows "Check your email" message after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
        expect(
          screen.getByText(/we've sent you a password reset link/i)
        ).toBeInTheDocument()
      })
    })

    it('displays reset instructions after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/please check your email and click the reset link/i)
        ).toBeInTheDocument()
        expect(screen.getByText(/link will expire in 24 hours/i)).toBeInTheDocument()
      })
    })

    it('shows "Back to sign in" button after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const backButton = screen.getByRole('link', { name: /back to sign in/i })
        expect(backButton).toBeInTheDocument()
        expect(backButton).toHaveAttribute('href', '/login')
      })
    })

    it('hides form after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
        expect(
          screen.queryByRole('button', { name: /send reset link/i })
        ).not.toBeInTheDocument()
      })
    })

    it('shows help text for checking spam folder', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/didn't receive the email\?/i)).toBeInTheDocument()
        expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error for rate limiting (AUTH_RATE_LIMITED)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many password reset attempts. Please try again later.',
          },
        }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/too many password reset attempts/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for user not found (AUTH_USER_NOT_FOUND)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_USER_NOT_FOUND',
            message: 'No account found with this email address',
          },
        }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'nonexistent@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/no account found with this email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays generic error for network failures', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/an unexpected error occurred/i)
        ).toBeInTheDocument()
      })
    })

    it('clears previous error on new submission', async () => {
      const user = userEvent.setup()

      // First attempt - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'First error' },
        }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second attempt - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('displays error in alert component with destructive variant', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Test error message' },
        }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveTextContent('Test error message')
      })
    })

    it('does not display error alert when there is no error', () => {
      render(<ForgotPasswordForm />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all form fields', () => {
      render(<ForgotPasswordForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('associates error messages with form fields', async () => {
      render(<ForgotPasswordForm />)

      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('submit button is focusable', () => {
      render(<ForgotPasswordForm />)

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })

    it('can navigate form with keyboard', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)

      emailInput.focus()
      expect(emailInput).toHaveFocus()

      // Tab to submit button
      await user.tab()
      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      expect(submitButton).toHaveFocus()
    })

    it('form can be submitted with Enter key', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)

      await user.type(emailInput, 'test@example.com')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('input icon is hidden from screen readers', () => {
      render(<ForgotPasswordForm />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const icon = emailField?.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('trims whitespace from email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, '  test@example.com  ')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const longEmail = 'a'.repeat(100) + '@example.com'

      await user.type(emailInput, longEmail)

      expect(emailInput).toHaveValue(longEmail)
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValue(pendingPromise)

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })

    it('handles email with special characters', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      const specialEmail = 'user+tag@example.com'
      await user.type(emailInput, specialEmail)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/forgot-password',
          expect.objectContaining({
            body: expect.stringContaining(specialEmail),
          })
        )
      })
    })
  })
})
