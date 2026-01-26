import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPasswordPage from '@/app/(auth)/reset-password/page'
import { AUTH } from '@/lib/constants'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
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

describe('Reset Password Page - E2E Style Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    // Set default token in search params
    mockSearchParams.set('token', 'valid-reset-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockSearchParams.delete('token')
  })

  describe('Page Rendering and Branding', () => {
    it('renders the reset password page with Luma branding', () => {
      render(<ResetPasswordPage />)

      // Check for Luma brand name
      const brandName = screen.getByText('Luma')
      expect(brandName).toBeInTheDocument()
      expect(brandName).toHaveClass('font-heading', 'text-3xl', 'font-bold')
    })

    it('renders the BookOpen icon (logo) next to brand name', () => {
      render(<ResetPasswordPage />)

      // The logo is rendered as an SVG with aria-hidden="true"
      const brandContainer = screen.getByText('Luma').parentElement
      expect(brandContainer).toBeInTheDocument()

      // Check the SVG icon is present
      const svgIcon = brandContainer?.querySelector('svg')
      expect(svgIcon).toBeInTheDocument()
      expect(svgIcon).toHaveAttribute('aria-hidden', 'true')
      expect(svgIcon).toHaveClass('h-8', 'w-8', 'text-indigo-600')
    })

    it('renders the tagline/footer text', () => {
      render(<ResetPasswordPage />)

      expect(screen.getByText('AI-Powered PDF Learning Assistant')).toBeInTheDocument()
    })

    it('has correct page layout and styling', () => {
      const { container } = render(<ResetPasswordPage />)

      // Check main container has correct flex layout
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass(
        'flex',
        'min-h-screen',
        'flex-col',
        'items-center',
        'justify-center',
        'bg-slate-50'
      )
    })
  })

  describe('Reset Password Form Display', () => {
    it('renders the reset password form card with all form elements', () => {
      render(<ResetPasswordPage />)

      // Check card header
      expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
      expect(
        screen.getByText(/enter your new password below/i)
      ).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()

      // Check submit button
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
    })

    it('renders password input with correct attributes', () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter new password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('renders confirm password input with correct attributes', () => {
      render(<ResetPasswordPage />)

      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm new password')
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('displays password requirements hint', () => {
      render(<ResetPasswordPage />)

      expect(
        screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
      ).toBeInTheDocument()
    })
  })

  describe('Input Icons', () => {
    it('renders Lock icons in password fields', () => {
      render(<ResetPasswordPage />)

      const passwordField = screen.getByLabelText(/^new password$/i).parentElement
      const confirmPasswordField = screen.getByLabelText(/confirm new password/i).parentElement

      expect(passwordField?.querySelector('svg')).toBeInTheDocument()
      expect(confirmPasswordField?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Token Handling', () => {
    it('extracts token from URL search params', async () => {
      const user = userEvent.setup()
      mockSearchParams.set('token', 'my-special-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

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

    it('shows error when token is missing', () => {
      mockSearchParams.delete('token')

      render(<ResetPasswordPage />)

      expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument()
    })

    it('shows link to request new token when token is missing', () => {
      mockSearchParams.delete('token')

      render(<ResetPasswordPage />)

      const requestNewLink = screen.getByRole('link', { name: /request a new link/i })
      expect(requestNewLink).toHaveAttribute('href', '/forgot-password')
    })
  })

  describe('Form Validation - Client Side', () => {
    it('displays validation error for short password', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'short')
      await user.type(confirmPasswordInput, 'short')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
        ).toBeInTheDocument()
      })
    })

    it('displays validation error for mismatched passwords', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

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

    it('clears validation errors when user corrects input', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      // Submit with mismatched passwords
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Different1!')
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })

      // Correct the password
      await user.clear(confirmPasswordInput)
      await user.type(confirmPasswordInput, 'Password1!')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Password Strength Indicator', () => {
    it('shows password strength indicator when typing password', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      await user.type(passwordInput, 'a')

      await waitFor(() => {
        expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument()
      })
    })

    it('shows "Weak" for simple passwords', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      await user.type(passwordInput, 'abc')

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })
    })

    it('shows "Strong" for complex passwords', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      await user.type(passwordInput, 'Password1!')

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })
    })

    it('displays password criteria checklist', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)

      await user.type(passwordInput, 'test')

      await waitFor(() => {
        expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument()
        expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/number/i)).toBeInTheDocument()
        expect(screen.getByText(/special character/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission and Loading State', () => {
    it('shows loading spinner and "Resetting..." text during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /resetting/i })
        expect(loadingButton).toBeInTheDocument()
        expect(loadingButton).toBeDisabled()

        const spinner = loadingButton.querySelector('svg.animate-spin')
        expect(spinner).toBeInTheDocument()
      })

      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })

    it('disables all form inputs during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ResetPasswordPage />)

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

    it('re-enables form after failed submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Reset failed' },
        }),
      })

      render(<ResetPasswordPage />)

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

  describe('Success Flow', () => {
    it('shows success message after successful reset', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

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

    it('hides form after success', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

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

    it('shows "Continue to sign in" link after success', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const continueLink = screen.getByRole('link', { name: /continue to sign in/i })
        expect(continueLink).toBeInTheDocument()
        expect(continueLink).toHaveAttribute('href', '/login')
      })
    })
  })

  describe('Error Messages Display', () => {
    it('displays error for expired link', async () => {
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

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'This password reset link has expired'
        )
      })
    })

    it('shows request new link option for expired token', async () => {
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

      render(<ResetPasswordPage />)

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

    it('displays generic error for network failure', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'An unexpected error occurred. Please try again.'
        )
      })
    })

    it('clears previous error message on new submission attempt', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'First error message' },
        }),
      })

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error message')).toBeInTheDocument()
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error message')).not.toBeInTheDocument()
      })
    })
  })

  describe('API Request', () => {
    it('sends correct data to reset password endpoint', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

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

    it('includes CSRF token in request headers', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

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

    it('does not send confirmPassword to API', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody).not.toHaveProperty('confirmPassword')
        expect(callBody).toEqual({
          token: 'valid-reset-token',
          password: 'NewPassword1!',
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<ResetPasswordPage />)

      const title = screen.getByText(/reset your password/i)
      expect(title).toBeInTheDocument()
    })

    it('form fields have proper labels for screen readers', () => {
      render(<ResetPasswordPage />)

      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
    })

    it('error messages are announced via alert role', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Test error' },
        }),
      })

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })

    it('form can be submitted with Enter key', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      await user.type(passwordInput, 'NewPassword1!')
      await user.type(confirmPasswordInput, 'NewPassword1!')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('tab order is logical', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText(/^new password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)

      passwordInput.focus()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()
    })

    it('input icons are hidden from screen readers', () => {
      render(<ResetPasswordPage />)

      const passwordField = screen.getByLabelText(/^new password$/i).parentElement
      const icon = passwordField?.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('handles password with special characters', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ResetPasswordPage />)

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

    it('prevents double submission during loading', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValue(pendingPromise)

      render(<ResetPasswordPage />)

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

    it('validates password strength indicator updates correctly', async () => {
      const user = userEvent.setup()
      render(<ResetPasswordPage />)

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
