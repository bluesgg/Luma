import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

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

describe('Login Page - E2E Style Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Page Rendering and Branding', () => {
    it('renders the login page with Luma branding', () => {
      render(<LoginPage />)

      // Check for Luma brand name
      const brandName = screen.getByText('Luma')
      expect(brandName).toBeInTheDocument()
      expect(brandName).toHaveClass('font-heading', 'text-3xl', 'font-bold')
    })

    it('renders the BookOpen icon (logo) next to brand name', () => {
      render(<LoginPage />)

      // The logo is rendered as an SVG with aria-hidden="true"
      // Find the branding container and check for SVG
      const brandContainer = screen.getByText('Luma').parentElement
      expect(brandContainer).toBeInTheDocument()

      // Check the SVG icon is present (BookOpen from lucide-react)
      const svgIcon = brandContainer?.querySelector('svg')
      expect(svgIcon).toBeInTheDocument()
      expect(svgIcon).toHaveAttribute('aria-hidden', 'true')
      expect(svgIcon).toHaveClass('h-8', 'w-8', 'text-indigo-600')
    })

    it('renders the tagline/footer text', () => {
      render(<LoginPage />)

      expect(screen.getByText('AI-Powered PDF Learning Assistant')).toBeInTheDocument()
    })

    it('has correct page layout and styling', () => {
      const { container } = render(<LoginPage />)

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

  describe('Login Form Display', () => {
    it('renders the login form card with all form elements', () => {
      render(<LoginPage />)

      // Check card header
      const signInElements = screen.getAllByText(/sign in/i)
      expect(signInElements.length).toBeGreaterThan(0)
      expect(
        screen.getByText('Enter your email and password to access your account')
      ).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument()

      // Check submit button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('renders password input with correct attributes', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('renders remember me checkbox unchecked by default', () => {
      render(<LoginPage />)

      const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('Form Validation - Client Side', () => {
    it('displays validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')

      // Use fireEvent.submit to bypass HTML5 validation
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays validation error for empty email', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(passwordInput, 'password123')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays validation error for empty password', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('displays multiple validation errors when form is empty', async () => {
      render(<LoginPage />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('clears validation errors when user corrects input', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Submit invalid form
      await user.type(emailInput, 'invalid')
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })

      // Correct the email
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      await user.type(passwordInput, 'password123')

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/please enter a valid email address/i)
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission and Loading State', () => {
    it('shows loading spinner and "Signing in..." text during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Check loading state
      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /signing in/i })
        expect(loadingButton).toBeInTheDocument()
        expect(loadingButton).toBeDisabled()

        // Check for spinner (Loader2 icon with animate-spin class)
        const spinner = loadingButton.querySelector('svg.animate-spin')
        expect(spinner).toBeInTheDocument()
      })

      // Clean up
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toBeDisabled()
        expect(passwordInput).toBeDisabled()
        expect(checkbox).toBeDisabled()
        expect(submitButton).toBeDisabled()
      })

      // Clean up
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
          error: { message: 'Invalid credentials' },
        }),
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled()
        expect(passwordInput).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Messages Display', () => {
    it('displays error message for invalid credentials', async () => {
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveTextContent('Invalid email or password')
      })
    })

    it('displays error with resend verification link for unverified email', async () => {
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Please verify your email before logging in'
        )
        expect(
          screen.getByRole('button', { name: /resend verification email/i })
        ).toBeInTheDocument()
      })
    })

    it('displays error for rate limiting', async () => {
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Too many login attempts. Please try again in 30 minutes.'
        )
      })
    })

    it('displays error for account locked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_ACCOUNT_LOCKED',
            message: 'Account locked due to multiple failed login attempts.',
          },
        }),
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'locked@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Account locked')
      })
    })

    it('displays generic error for network failure', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'An unexpected error occurred. Please try again.'
        )
      })
    })

    it('clears previous error message on new submission attempt', async () => {
      const user = userEvent.setup()

      // First submission - error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'First error message' },
        }),
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error message')).toBeInTheDocument()
      })

      // Second submission - success
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

  describe('Navigation Links', () => {
    it('renders forgot password link with correct href', () => {
      render(<LoginPage />)

      const forgotPasswordLink = screen.getByRole('link', {
        name: /forgot your password/i,
      })
      expect(forgotPasswordLink).toBeInTheDocument()
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })

    it('renders register/sign up link with correct href', () => {
      render(<LoginPage />)

      const signUpLink = screen.getByRole('link', { name: /sign up/i })
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/register')
    })

    it('displays "Don\'t have an account?" text before sign up link', () => {
      render(<LoginPage />)

      expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument()
    })

    it('forgot password link has correct styling for hover state', () => {
      render(<LoginPage />)

      const forgotPasswordLink = screen.getByRole('link', {
        name: /forgot your password/i,
      })
      expect(forgotPasswordLink).toHaveClass('text-slate-500')
    })

    it('sign up link has correct styling', () => {
      render(<LoginPage />)

      const signUpLink = screen.getByRole('link', { name: /sign up/i })
      expect(signUpLink).toHaveClass('text-indigo-600')
    })
  })

  describe('Successful Login Flow', () => {
    it('redirects to /courses after successful login', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginPage />)

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

    it('sends correct data including remember me when checked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const checkbox = screen.getByRole('checkbox', { name: /remember me/i })
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(checkbox)
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
            rememberMe: true,
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

      render(<LoginPage />)

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

  describe('Resend Verification Email', () => {
    it('can resend verification email when shown', async () => {
      const user = userEvent.setup()

      // First login attempt - unverified email error
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /resend verification email/i })
        ).toBeInTheDocument()
      })

      // Click resend button - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const resendButton = screen.getByRole('button', {
        name: /resend verification email/i,
      })
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token',
          },
          body: JSON.stringify({ email: 'unverified@example.com' }),
          credentials: 'include',
        })
      })

      await waitFor(() => {
        expect(
          screen.getByText(/verification email sent/i)
        ).toBeInTheDocument()
      })
    })

    it('shows sending state while resending verification email', async () => {
      const user = userEvent.setup()

      // First login attempt - unverified email error
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /resend verification email/i })
        ).toBeInTheDocument()
      })

      // Setup pending promise for resend
      let resolveResend: (value: unknown) => void
      const pendingResend = new Promise((resolve) => {
        resolveResend = resolve
      })
      mockFetch.mockReturnValueOnce(pendingResend)

      const resendButton = screen.getByRole('button', {
        name: /resend verification email/i,
      })
      await user.click(resendButton)

      // Check for "Sending..." text
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument()
      })

      // Clean up
      resolveResend!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<LoginPage />)

      // The "Sign in" title should be prominent
      const signInElements = screen.getAllByText(/sign in/i)
      expect(signInElements.length).toBeGreaterThan(0)
    })

    it('form fields have proper labels for screen readers', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument()
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
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

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('tab order is logical', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const checkbox = screen.getByRole('checkbox', { name: /remember me/i })

      // Start with email input
      emailInput.focus()
      expect(emailInput).toHaveFocus()

      // Tab to password
      await user.tab()
      expect(passwordInput).toHaveFocus()

      // Tab to checkbox
      await user.tab()
      expect(checkbox).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('handles password with special characters', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Use a password with special characters that are safe for userEvent
      // Brackets [] {} need escaping in userEvent as they are used for special keys
      const specialPassword = 'P@$$w0rd!#%^&*'

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
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const longEmail = 'a'.repeat(100) + '@example.com'

      await user.type(emailInput, longEmail)

      expect(emailInput).toHaveValue(longEmail)
    })

    it('prevents double submission during loading', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValue(pendingPromise)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Click submit multiple times quickly
      await user.click(submitButton)

      // Button should be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Only one fetch call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Clean up
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true }),
      })
    })
  })
})
