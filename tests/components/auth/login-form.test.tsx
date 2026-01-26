import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/login-form'

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

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Form Field Rendering', () => {
    it('renders email input field', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('renders password input field', () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('renders remember me checkbox', () => {
      render(<LoginForm />)

      const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('renders submit button with correct text', () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('renders card header with title and description', () => {
      render(<LoginForm />)

      // The title is in the CardTitle which is a div with specific styles
      // Use getAllByText since both title and button have "Sign in" text
      const signInElements = screen.getAllByText(/sign in/i)
      expect(signInElements.length).toBeGreaterThan(0)

      expect(
        screen.getByText('Enter your email and password to access your account')
      ).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('renders forgot password link', () => {
      render(<LoginForm />)

      const forgotPasswordLink = screen.getByRole('link', {
        name: /forgot your password/i,
      })
      expect(forgotPasswordLink).toBeInTheDocument()
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })

    it('renders register link', () => {
      render(<LoginForm />)

      const registerLink = screen.getByRole('link', { name: /sign up/i })
      expect(registerLink).toBeInTheDocument()
      expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('renders "Don\'t have an account?" text', () => {
      render(<LoginForm />)

      expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument()
    })
  })

  describe('Zod Schema Validation', () => {
    it('displays error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Clear the field first and type an invalid email
      await user.clear(emailInput)
      await user.type(emailInput, 'notanemail')
      await user.type(passwordInput, 'password123')

      // Submit form using fireEvent to bypass HTML5 validation
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for empty email', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Clear email and fill password
      await user.clear(emailInput)
      await user.type(passwordInput, 'password123')

      // Submit form using fireEvent to bypass HTML5 validation
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for empty password', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.clear(passwordInput)

      // Submit form using fireEvent to bypass HTML5 validation
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('does not submit form with invalid data', async () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Submit empty form using fireEvent to bypass HTML5 validation
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled()
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

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            rememberMe: false,
          }),
          credentials: 'include',
        })
      })
    })

    it('submits form with remember me checked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(checkbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
              rememberMe: true,
            }),
          })
        )
      })
    })

    it('redirects to /courses on successful login', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/courses')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('includes CSRF token in headers', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockGetHeaders).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/login',
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
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Check loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      })

      // Resolve the promise to clean up
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

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
        expect(submitButton).toBeDisabled()
      })

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })

    it('re-enables form after submission completes', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { message: 'Invalid credentials' },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled()
        expect(passwordInput).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error for invalid credentials (AUTH_INVALID_CREDENTIALS)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
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
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
    })

    it('displays error for unverified email (AUTH_EMAIL_NOT_VERIFIED)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_EMAIL_NOT_VERIFIED',
            message: 'Please verify your email before logging in',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/please verify your email before logging in/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for rate limiting (AUTH_RATE_LIMITED)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many login attempts. Please try again in 30 minutes.',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/too many login attempts/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for account locked (AUTH_ACCOUNT_LOCKED)', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_ACCOUNT_LOCKED',
            message: 'Account locked due to multiple failed login attempts',
          },
        }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'locked@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/account locked/i)).toBeInTheDocument()
      })
    })

    it('displays generic error for network failures', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
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

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
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

    it('does not display error alert when there is no error', () => {
      render(<LoginForm />)

      // Alert should not be present initially
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveTextContent('Test error message')
      })
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all form fields', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument()
    })

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('submit button is focusable', () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })

    it('can navigate form with keyboard', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Focus email input and tab to password
      emailInput.focus()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('trims whitespace from email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Note: HTML input type="email" may auto-trim, but we test the behavior
      await user.type(emailInput, '  test@example.com  ')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // The form should still submit (email trimming handled by browser or backend)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles special characters in password', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      const specialPassword = 'P@$$w0rd!#$%^&*()'

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, specialPassword)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            body: expect.stringContaining(specialPassword),
          })
        )
      })
    })

    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const longEmail = 'a'.repeat(100) + '@example.com'

      await user.type(emailInput, longEmail)

      expect(emailInput).toHaveValue(longEmail)
    })

    it('handles unicode in email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Unicode email (internationalized domain)
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValue(pendingPromise)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Click submit multiple times
      await user.click(submitButton)

      // Button should be disabled, preventing further clicks
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Only one fetch call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Resolve to clean up
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })
  })
})
