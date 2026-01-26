import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'

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

describe('Forgot Password Page - E2E Style Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Page Rendering and Branding', () => {
    it('renders the forgot password page with Luma branding', () => {
      render(<ForgotPasswordPage />)

      // Check for Luma brand name
      const brandName = screen.getByText('Luma')
      expect(brandName).toBeInTheDocument()
      expect(brandName).toHaveClass('font-heading', 'text-3xl', 'font-bold')
    })

    it('renders the BookOpen icon (logo) next to brand name', () => {
      render(<ForgotPasswordPage />)

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
      render(<ForgotPasswordPage />)

      expect(screen.getByText('AI-Powered PDF Learning Assistant')).toBeInTheDocument()
    })

    it('has correct page layout and styling', () => {
      const { container } = render(<ForgotPasswordPage />)

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

  describe('Forgot Password Form Display', () => {
    it('renders the forgot password form card with all form elements', () => {
      render(<ForgotPasswordPage />)

      // Check card header
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
      expect(
        screen.getByText(/enter your email address and we'll send you a link to reset your password/i)
      ).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()

      // Check submit button
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })
  })

  describe('Input Icons', () => {
    it('renders Mail icon in email field', () => {
      render(<ForgotPasswordPage />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const icon = emailField?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('text-slate-400')
    })
  })

  describe('Form Validation - Client Side', () => {
    it('displays validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'invalid-email')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays validation error for empty email', async () => {
      render(<ForgotPasswordPage />)

      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('clears validation errors when user corrects input', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'invalid')
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })

      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')

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
    it('shows loading spinner and "Sending..." text during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /sending/i })
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

      render(<ForgotPasswordPage />)

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

    it('re-enables form after failed submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Request failed' },
        }),
      })

      render(<ForgotPasswordPage />)

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

  describe('Success Flow', () => {
    it('shows success message after successful submission', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

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

    it('hides form after success', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

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

    it('shows reset instructions', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/please check your email and click the reset link/i)
        ).toBeInTheDocument()
        expect(screen.getByText(/24 hours/i)).toBeInTheDocument()
      })
    })

    it('shows "Back to sign in" link after success', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to sign in/i })
        expect(backLink).toBeInTheDocument()
        expect(backLink).toHaveAttribute('href', '/login')
      })
    })
  })

  describe('Error Messages Display', () => {
    it('displays error message for rate limiting', async () => {
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

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveTextContent('Too many password reset attempts')
      })
    })

    it('displays generic error for network failure', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
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

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
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

  describe('Navigation Links', () => {
    it('renders back to sign in link with correct href', () => {
      render(<ForgotPasswordPage />)

      const backToLoginLink = screen.getByRole('link', { name: /back to sign in/i })
      expect(backToLoginLink).toBeInTheDocument()
      expect(backToLoginLink).toHaveAttribute('href', '/login')
    })

    it('displays "Remember your password?" text before back to login link', () => {
      render(<ForgotPasswordPage />)

      expect(screen.getByText(/remember your password\?/i)).toBeInTheDocument()
    })

    it('back to login link has correct styling', () => {
      render(<ForgotPasswordPage />)

      const backToLoginLink = screen.getByRole('link', { name: /back to sign in/i })
      expect(backToLoginLink).toHaveClass('text-indigo-600')
    })
  })

  describe('API Request', () => {
    it('sends correct data to forgot password endpoint', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

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

    it('includes CSRF token in request headers', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

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

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<ForgotPasswordPage />)

      const title = screen.getByText(/forgot password/i)
      expect(title).toBeInTheDocument()
    })

    it('form fields have proper labels for screen readers', () => {
      render(<ForgotPasswordPage />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
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

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
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

      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)

      await user.type(emailInput, 'test@example.com')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('tab order is logical', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

      const emailInput = screen.getByLabelText(/email/i)

      emailInput.focus()
      expect(emailInput).toHaveFocus()

      await user.tab()
      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      expect(submitButton).toHaveFocus()
    })

    it('input icons are hidden from screen readers', () => {
      render(<ForgotPasswordPage />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const icon = emailField?.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Edge Cases', () => {
    it('handles email with special characters', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<ForgotPasswordPage />)

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

    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      render(<ForgotPasswordPage />)

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

      render(<ForgotPasswordPage />)

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
  })
})
