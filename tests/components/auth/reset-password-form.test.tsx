import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
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

describe('ResetPasswordForm', () => {
  const defaultProps = {
    token: 'valid-reset-token',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Form Field Rendering', () => {
    it('renders password input field', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter new password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('renders confirm password input field', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      expect(confirmPasswordInput).toBeInTheDocument()
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm new password')
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('renders submit button with correct text', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /reset password/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('renders card header with title and description', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
      expect(
        screen.getByText(/enter your new password below/i)
      ).toBeInTheDocument()
    })

    it('renders password requirement description', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      expect(
        screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
      ).toBeInTheDocument()
    })
  })

  describe('Input Icons', () => {
    it('renders Lock icon in password input field', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordField = screen.getByLabelText(/^new password$/i).parentElement
      const lockIcon = passwordField?.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
      expect(lockIcon).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders Lock icon in confirm password input field', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const confirmPasswordField = screen.getByLabelText(/confirm new password/i).parentElement
      const lockIcon = confirmPasswordField?.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
      expect(lockIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Zod Schema Validation', () => {
    it('displays error for password less than minimum length', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'short') // Less than 8 characters
      await user.type(confirmPasswordInput, 'short')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
        ).toBeInTheDocument()
      })
    })

    it('displays error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'DifferentPassword1!')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('displays error for empty password', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(confirmPasswordInput, 'Password1!')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
        ).toBeInTheDocument()
      })
    })

    it('does not submit form with invalid data', async () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /reset password/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })

    it('handles matching passwords with different capitalization', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'PASSWORD1!') // Different case

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })
  })

  describe('Password Strength Indicator Integration', () => {
    it('renders password strength indicator when password is entered', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      await user.type(passwordInput, 'a')

      await waitFor(() => {
        expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument()
      })
    })

    it('does not show password strength indicator when password is empty', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument()
    })

    it('updates strength indicator as user types', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      // Type a weak password
      await user.type(passwordInput, 'abc')
      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })

      // Clear and type a strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'Password1!')
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })
    })

    it('shows criteria checklist for password', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      await user.type(passwordInput, 'abc')

      await waitFor(() => {
        expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument()
        expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/number/i)).toBeInTheDocument()
        expect(screen.getByText(/special character/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token',
          },
          body: JSON.stringify({
            token: 'valid-reset-token',
            password: 'NewPassword1!',
          }),
          credentials: 'include',
        })
      })
    })

    it('does not send confirmPassword to API', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody).not.toHaveProperty('confirmPassword')
      })
    })

    it('includes CSRF token in headers', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockGetHeaders).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/reset-password',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-CSRF-Token': 'test-csrf-token',
            }),
          })
        )
      })
    })

    it('includes reset token in request body', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm token="my-special-token" />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody.token).toBe('my-special-token')
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

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resetting/i })).toBeInTheDocument()
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

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /resetting/i })
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

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(passwordInput).toBeDisabled()
        expect(confirmPasswordInput).toBeDisabled()
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
          error: { message: 'Reset failed' },
        }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(passwordInput).not.toBeDisabled()
        expect(confirmPasswordInput).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Success State', () => {
    it('shows success message after successful password reset', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
        expect(
          screen.getByText(/your password has been reset successfully/i)
        ).toBeInTheDocument()
      })
    })

    it('shows "Continue to sign in" button after successful reset', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const continueButton = screen.getByRole('link', { name: /continue to sign in/i })
        expect(continueButton).toBeInTheDocument()
        expect(continueButton).toHaveAttribute('href', '/login')
      })
    })

    it('hides form after successful reset', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/confirm new password/i)).not.toBeInTheDocument()
        expect(
          screen.queryByRole('button', { name: /reset password/i })
        ).not.toBeInTheDocument()
      })
    })

    it('triggers redirect after success', async () => {
      const user = userEvent.setup()
      vi.useFakeTimers({ shouldAdvanceTime: true })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
      })

      // Advance timers to trigger auto-redirect
      vi.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('displays generic error message', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_RESET_FAILED',
            message: 'Failed to reset password',
          },
        }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to reset password/i)).toBeInTheDocument()
      })
    })

    it('displays expired link error (401 status)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'This password reset link has expired',
          },
        }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/this password reset link has expired/i)
        ).toBeInTheDocument()
      })
    })

    it('shows request new link option for expired link', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'This password reset link has expired',
          },
        }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const requestNewLink = screen.getByRole('link', { name: /request a new link/i })
        expect(requestNewLink).toBeInTheDocument()
        expect(requestNewLink).toHaveAttribute('href', '/forgot-password')
      })
    })

    it('displays invalid token error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid password reset token',
          },
        }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid password reset token/i)).toBeInTheDocument()
      })
    })

    it('displays generic error for network failures', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
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

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
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

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveTextContent('Test error message')
      })
    })

    it('does not display error alert when there is no error', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all form fields', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    })

    it('associates error messages with form fields', async () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /reset password/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/^new password$/i)
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('submit button is focusable', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /reset password/i })
      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })

    it('can navigate form with keyboard', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      passwordInput.focus()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()
    })

    it('form can be submitted with Enter key', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('input icons are hidden from screen readers', () => {
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordField = screen.getByLabelText(/^new password$/i).parentElement
      const icon = passwordField?.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('handles special characters in password', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      const specialPassword = 'P@$$w0rd!#%^&*'

      await user.type(passwordInput, specialPassword)
      await user.type(confirmPasswordInput, specialPassword)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/reset-password',
          expect.objectContaining({
            body: expect.stringContaining(specialPassword),
          })
        )
      })
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValue(pendingPromise)

      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
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

    it('handles token with special characters', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const specialToken = 'abc123-def456_ghi789+jkl012='

      render(<ResetPasswordForm token={specialToken} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody.token).toBe(specialToken)
      })
    })

    it('validates password strength indicator updates correctly', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordForm {...defaultProps} />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      // Type weak password
      await user.type(passwordInput, 'abc')
      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })

      // Clear and type strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'StrongP@ss1')
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })

      // Clear password
      await user.clear(passwordInput)
      await waitFor(() => {
        expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument()
      })
    })
  })
})
