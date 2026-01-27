// =============================================================================
// Login Form Component Tests (TDD)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Component will be implemented later
const LoginForm = () => <div>Login Form</div>

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render login form with email and password fields', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /log in/i })
      ).toBeInTheDocument()
    })

    it('should render remember me checkbox', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
    })

    it('should render forgot password link', () => {
      render(<LoginForm />)

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it('should render register link', () => {
      render(<LoginForm />)

      expect(screen.getByText(/sign up|create account/i)).toBeInTheDocument()
    })

    it('should render password show/hide toggle', () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')

      const toggleButton = screen.getByRole('button', {
        name: /show|hide password/i,
      })
      expect(toggleButton).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should allow typing in email field', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user@example.com')

      expect(emailInput).toHaveValue('user@example.com')
    })

    it('should allow typing in password field', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const checkbox = screen.getByLabelText(/remember me/i)
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = screen.getByRole('button', {
        name: /show|hide password/i,
      })

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Blur event

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })

    it('should show error for empty email', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /log in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for empty password', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user@example.com')

      const submitButton = screen.getByRole('button', { name: /log in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should clear error when user corrects input', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })

      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')

      await waitFor(() => {
        expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
          rememberMe: false,
        })
      })
    })

    it('should include rememberMe in submission', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByLabelText(/remember me/i))
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
          rememberMe: true,
        })
      })
    })

    it('should show loading state during submission', async () => {
      const handleSubmit = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /logging in|loading/i })
        ).toBeDisabled()
      })
    })

    it('should disable form fields during submission', async () => {
      const handleSubmit = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeDisabled()
        expect(screen.getByLabelText(/password/i)).toBeDisabled()
      })
    })

    it('should prevent multiple submissions', async () => {
      const handleSubmit = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      const submitButton = screen.getByRole('button', { name: /log in/i })
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message for invalid credentials', async () => {
      const handleSubmit = vi.fn().mockRejectedValue({
        message: 'Invalid email or password',
      })
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email or password/i)
        ).toBeInTheDocument()
      })
    })

    it('should display error for unverified email', async () => {
      const handleSubmit = vi.fn().mockRejectedValue({
        code: 'AUTH_EMAIL_NOT_VERIFIED',
        message: 'Please verify your email',
      })
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'unverified@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
      })
    })

    it('should display error for locked account', async () => {
      const handleSubmit = vi.fn().mockRejectedValue({
        code: 'AUTH_ACCOUNT_LOCKED',
        message: 'Account locked for 30 minutes',
      })
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'locked@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(screen.getByText(/account locked/i)).toBeInTheDocument()
      })
    })

    it('should re-enable form after error', async () => {
      const handleSubmit = vi.fn().mockRejectedValue(new Error('Login failed'))
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/email/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/password/i)).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<LoginForm />)

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('id')
    })

    it('should show error messages with aria-live', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        const errorRegion = screen.getByRole('alert')
        expect(errorRegion).toBeInTheDocument()
      })
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      await user.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/remember me/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /log in/i })).toHaveFocus()
    })

    it('should submit form on Enter key', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()

      render(<LoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123{Enter}')

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled()
      })
    })
  })
})
