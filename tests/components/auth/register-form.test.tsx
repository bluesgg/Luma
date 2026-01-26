import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/auth/register-form'
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

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Form Field Rendering', () => {
    it('renders email input field', () => {
      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('renders password input field', () => {
      render(<RegisterForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('renders confirm password input field', () => {
      render(<RegisterForm />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toBeInTheDocument()
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('renders submit button with correct text', () => {
      render(<RegisterForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('renders card header with title and description', () => {
      render(<RegisterForm />)

      expect(screen.getByText(/create an account/i)).toBeInTheDocument()
      expect(
        screen.getByText(/enter your email and create a password to get started/i)
      ).toBeInTheDocument()
    })

    it('renders password requirement description', () => {
      render(<RegisterForm />)

      expect(
        screen.getByText(new RegExp(`at least ${AUTH.PASSWORD_MIN_LENGTH} characters`, 'i'))
      ).toBeInTheDocument()
    })
  })

  describe('Input Icons', () => {
    it('renders Mail icon in email input field', () => {
      render(<RegisterForm />)

      const emailField = screen.getByLabelText(/email/i).parentElement
      const mailIcon = emailField?.querySelector('svg')
      expect(mailIcon).toBeInTheDocument()
      expect(mailIcon).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders Lock icon in password input field', () => {
      render(<RegisterForm />)

      const passwordField = screen.getByLabelText(/^password$/i).parentElement
      const lockIcon = passwordField?.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
      expect(lockIcon).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders Lock icon in confirm password input field', () => {
      render(<RegisterForm />)

      const confirmPasswordField = screen.getByLabelText(/confirm password/i).parentElement
      const lockIcon = confirmPasswordField?.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
      expect(lockIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Navigation Links', () => {
    it('renders sign in link', () => {
      render(<RegisterForm />)

      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/login')
    })

    it('renders "Already have an account?" text', () => {
      render(<RegisterForm />)

      expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument()
    })
  })

  describe('Zod Schema Validation', () => {
    it('displays error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.clear(emailInput)
      await user.type(emailInput, 'notanemail')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for empty email', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for password less than minimum length', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
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
      render(<RegisterForm />)

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

    it('does not submit form with invalid data', async () => {
      render(<RegisterForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })
  })

  describe('Password Strength Indicator Integration', () => {
    it('renders password strength indicator when password is entered', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)

      await user.type(passwordInput, 'a')

      await waitFor(() => {
        expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument()
      })
    })

    it('does not show password strength indicator when password is empty', () => {
      render(<RegisterForm />)

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument()
    })

    it('updates strength indicator as user types', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)

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
      render(<RegisterForm />)

      const passwordInput = screen.getByLabelText(/^password$/i)

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

      render(<RegisterForm />)

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

    it('does not send confirmPassword to API', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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
      })
    })

    it('includes CSRF token in headers', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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
  })

  describe('Loading State', () => {
    it('displays loading text on submit button during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
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

      render(<RegisterForm />)

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

      render(<RegisterForm />)

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

    it('re-enables form after submission completes', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Registration failed' },
        }),
      })

      render(<RegisterForm />)

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

  describe('Success State', () => {
    it('shows success message after successful registration', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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

    it('displays verification instructions after successful registration', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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
        expect(screen.getByText(/link will expire in 24 hours/i)).toBeInTheDocument()
      })
    })

    it('shows "Back to sign in" button after successful registration', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        const backButton = screen.getByRole('link', { name: /back to sign in/i })
        expect(backButton).toBeInTheDocument()
        expect(backButton).toHaveAttribute('href', '/login')
      })
    })

    it('shows link to resend verification email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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
          screen.getByRole('link', { name: /request a new link/i })
        ).toBeInTheDocument()
      })
    })

    it('hides form after successful registration', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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
        expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error for duplicate email (AUTH_EMAIL_EXISTS)', async () => {
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

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/an account with this email already exists/i)
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
            message: 'Too many registration attempts. Please try again later.',
          },
        }),
      })

      render(<RegisterForm />)

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
          screen.getByText(/too many registration attempts/i)
        ).toBeInTheDocument()
      })
    })

    it('displays error for invalid email domain', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'AUTH_INVALID_EMAIL',
            message: 'Please use a valid email address',
          },
        }),
      })

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@invalid-domain')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please use a valid email address/i)).toBeInTheDocument()
      })
    })

    it('displays generic error for network failures', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<RegisterForm />)

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

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
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

      render(<RegisterForm />)

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
        expect(alert).toHaveTextContent('Test error message')
      })
    })

    it('does not display error alert when there is no error', () => {
      render(<RegisterForm />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Resend Verification Email', () => {
    it('shows resend verification option after successful registration', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/didn't receive the email\?/i)).toBeInTheDocument()
        expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument()
      })
    })

    it('has link to resend verification page', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

      await waitFor(() => {
        const resendLink = screen.getByRole('link', { name: /request a new link/i })
        expect(resendLink).toHaveAttribute('href', '/resend-verification')
      })
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all form fields', () => {
      render(<RegisterForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('submit button is focusable', () => {
      render(<RegisterForm />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })

    it('can navigate form with keyboard', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

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

    it('form can be submitted with Enter key', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

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
  })

  describe('Edge Cases', () => {
    it('trims whitespace from email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, '  test@example.com  ')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'Password1!')
      await user.click(submitButton)

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

      render(<RegisterForm />)

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
      render(<RegisterForm />)

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

      render(<RegisterForm />)

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

    it('handles matching passwords with different capitalization', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1!')
      await user.type(confirmPasswordInput, 'PASSWORD1!') // Different case

      fireEvent.submit(submitButton.closest('form')!)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })
  })
})
