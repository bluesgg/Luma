import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '@/app/(auth)/register/page'
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

describe('Register Page - E2E Style Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Page Rendering and Branding', () => {
    it('renders the register page with Luma branding', () => {
      render(<RegisterPage />)

      // Check for Luma brand name
      const brandName = screen.getByText('Luma')
      expect(brandName).toBeInTheDocument()
      expect(brandName).toHaveClass('font-heading', 'text-3xl', 'font-bold')
    })

    it('renders the BookOpen icon (logo) next to brand name', () => {
      render(<RegisterPage />)

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
      render(<RegisterPage />)

      expect(screen.getByText('AI-Powered PDF Learning Assistant')).toBeInTheDocument()
    })

    it('has correct page layout and styling', () => {
      const { container } = render(<RegisterPage />)

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

  describe('Register Form Display', () => {
    it('renders the register form card with all form elements', () => {
      render(<RegisterPage />)

      // Check card header
      expect(screen.getByText(/create an account/i)).toBeInTheDocument()
      expect(
        screen.getByText(/enter your email and create a password to get started/i)
      ).toBeInTheDocument()

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()

      // Check submit button
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('renders email input with correct attributes', () => {
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('renders password input with correct attributes', () => {
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('renders confirm password input with correct attributes', () => {
      render(<RegisterPage />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('displays password requirements hint', () => {
      render(<RegisterPage />)

      expect(
        screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
      ).toBeInTheDocument()
    })
  })

  describe('Input Icons', () => {
    it('renders Mail icon in email field', () => {
      render(<RegisterPage />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const icon = emailField?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('text-slate-400')
    })

    it('renders Lock icons in password fields', () => {
      render(<RegisterPage />)

      const passwordField = screen.getByLabelText(/^password$/i).parentElement
      const confirmPasswordField = screen.getByLabelText(/confirm password/i).parentElement

      expect(passwordField?.querySelector('svg')).toBeInTheDocument()
      expect(confirmPasswordField?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Form Validation - Client Side', () => {
    it('displays validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays validation error for short password', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
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
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'DifferentPassword1!')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('displays multiple validation errors when form is empty', async () => {
      render(<RegisterPage />)

      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('clears validation errors when user corrects input', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'invalid')
      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })

      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')

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

  describe('Password Strength Indicator', () => {
    it('shows password strength indicator when typing password', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(passwordInput, 'a')

      await waitFor(() => {
        expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument()
      })
    })

    it('shows "Weak" for simple passwords', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(passwordInput, 'abc')

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })
    })

    it('shows "Strong" for complex passwords', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(passwordInput, 'Password1!')

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument()
      })
    })

    it('displays password criteria checklist', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(passwordInput, 'test')

      await waitFor(() => {
        expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument()
        expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument()
        expect(screen.getByText(/number/i)).toBeInTheDocument()
        expect(screen.getByText(/special character/i)).toBeInTheDocument()
      })
    })

    it('updates criteria checkmarks as password improves', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      // Start with just lowercase
      await user.type(passwordInput, 'abcd')

      await waitFor(() => {
        const metCriteria = screen.getAllByTestId('criteria-met')
        expect(metCriteria.length).toBe(1) // lowercase only
      })

      // Add more to meet length
      await user.type(passwordInput, 'efgh')

      await waitFor(() => {
        const metCriteria = screen.getAllByTestId('criteria-met')
        expect(metCriteria.length).toBe(2) // lowercase + length
      })
    })
  })

  describe('Form Submission and Loading State', () => {
    it('shows loading spinner and "Creating account..." text during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /creating account/i })
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toBeDisabled()
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
          error: { message: 'Registration failed' },
        }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled()
        expect(passwordInput).not.toBeDisabled()
        expect(confirmPasswordInput).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Success Flow', () => {
    it('shows success message after successful registration', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
        expect(
          screen.getByText(/we've sent you a verification link/i)
        ).toBeInTheDocument()
      })
    })

    it('hides registration form after success', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument()
      })
    })

    it('shows verification instructions', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/please check your email and click the verification link/i)
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to sign in/i })
        expect(backLink).toBeInTheDocument()
        expect(backLink).toHaveAttribute('href', '/login')
      })
    })
  })

  describe('Error Messages Display', () => {
    it('displays error message for duplicate email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_EMAIL_EXISTS',
            message: 'An account with this email already exists',
          },
        }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveTextContent('An account with this email already exists')
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
            message: 'Too many registration attempts. Please try again later.',
          },
        }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Too many registration attempts'
        )
      })
    })

    it('displays generic error for network failure', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
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
    it('renders sign in link with correct href', () => {
      render(<RegisterPage />)

      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/login')
    })

    it('displays "Already have an account?" text before sign in link', () => {
      render(<RegisterPage />)

      expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument()
    })

    it('sign in link has correct styling', () => {
      render(<RegisterPage />)

      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toHaveClass('text-indigo-600')
    })
  })

  describe('API Request', () => {
    it('sends correct data to registration endpoint', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'Password1!',
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockGetHeaders).toHaveBeenCalled()
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/register',
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody).not.toHaveProperty('confirmPassword')
        expect(callBody).toEqual({
          email: 'test@example.com',
          password: 'Password1!',
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<RegisterPage />)

      const title = screen.getByText(/create an account/i)
      expect(title).toBeInTheDocument()
    })

    it('form fields have proper labels for screen readers', () => {
      render(<RegisterPage />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('tab order is logical', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

      emailInput.focus()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()
    })

    it('input icons are hidden from screen readers', () => {
      render(<RegisterPage />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const icon = emailField?.querySelector('svg')
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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      const specialPassword = 'P@$$w0rd!#%^&*'

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, specialPassword)
      await user.type(confirmPasswordInput, specialPassword)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/register',
          expect.objectContaining({
            body: expect.stringContaining(specialPassword),
          })
        )
      })
    })

    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)

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

      render(<RegisterPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')

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
      render(<RegisterPage />)

      const passwordInput = screen.getByLabelText(/^password$/i)

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
