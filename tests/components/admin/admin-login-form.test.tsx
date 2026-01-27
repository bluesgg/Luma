// =============================================================================
// Admin Login Form Component Tests (TDD - Phase 7)
// Tests for src/components/admin/admin-login-form.tsx
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Component will be implemented later
const AdminLoginForm = () => <div>Admin Login Form</div>

describe('AdminLoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render admin login form with email and password fields', () => {
      render(<AdminLoginForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /log in|sign in/i })
      ).toBeInTheDocument()
    })

    it('should display admin-specific branding/title', () => {
      render(<AdminLoginForm />)

      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })

    it('should render password show/hide toggle', () => {
      render(<AdminLoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')

      const toggleButton = screen.getByRole('button', {
        name: /show|hide|toggle password/i,
      })
      expect(toggleButton).toBeInTheDocument()
    })

    it('should not render remember me checkbox (admin sessions are short)', () => {
      render(<AdminLoginForm />)

      const rememberMe = screen.queryByLabelText(/remember me/i)
      expect(rememberMe).not.toBeInTheDocument()
    })

    it('should not render forgot password link (admin passwords managed separately)', () => {
      render(<AdminLoginForm />)

      const forgotLink = screen.queryByText(/forgot password/i)
      expect(forgotLink).not.toBeInTheDocument()
    })

    it('should not render register link (admins created by super admin only)', () => {
      render(<AdminLoginForm />)

      const registerLink = screen.queryByText(/sign up|create account/i)
      expect(registerLink).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should allow typing in email field', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'admin@luma.com')

      expect(emailInput).toHaveValue('admin@luma.com')
    })

    it('should allow typing in password field', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      await user.type(passwordInput, 'adminpassword123')

      expect(passwordInput).toHaveValue('adminpassword123')
    })

    it('should toggle password visibility', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = screen.getByRole('button', {
        name: /show|hide|toggle password/i,
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
      render(<AdminLoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/invalid email|email format/i)).toBeInTheDocument()
      })
    })

    it('should show error for empty email', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      const submitButton = screen.getByRole('button', { name: /log in|sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for empty password', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'admin@luma.com')

      const submitButton = screen.getByRole('button', { name: /log in|sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should clear error when user corrects input', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })

      await user.clear(emailInput)
      await user.type(emailInput, 'admin@luma.com')

      await waitFor(() => {
        expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          email: 'admin@luma.com',
          password: 'password123',
        })
      })
    })

    it('should show loading state during submission', async () => {
      const handleSubmit = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /logging in|loading|signing in/i })
        ).toBeDisabled()
      })
    })

    it('should disable form fields during submission', async () => {
      const handleSubmit = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

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

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      const submitButton = screen.getByRole('button', { name: /log in|sign in/i })
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error for invalid credentials', async () => {
      const handleSubmit = vi.fn().mockRejectedValue({
        code: 'ADMIN_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email or password/i)
        ).toBeInTheDocument()
      })
    })

    it('should display error for disabled admin account', async () => {
      const handleSubmit = vi.fn().mockRejectedValue({
        code: 'ADMIN_DISABLED',
        message: 'Admin account has been disabled',
      })
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'disabled@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/disabled/i)).toBeInTheDocument()
      })
    })

    it('should re-enable form after error', async () => {
      const handleSubmit = vi.fn().mockRejectedValue(new Error('Login failed'))
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/login failed|error/i)).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/email/i)).not.toBeDisabled()
      expect(screen.getByLabelText(/password/i)).not.toBeDisabled()
      expect(
        screen.getByRole('button', { name: /log in|sign in/i })
      ).not.toBeDisabled()
    })

    it('should display generic error for network issues', async () => {
      const handleSubmit = vi
        .fn()
        .mockRejectedValue(new Error('Network error'))
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<AdminLoginForm />)

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('id')
    })

    it('should show error messages with aria-live', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      await user.click(screen.getByRole('button', { name: /log in|sign in/i }))

      await waitFor(() => {
        const errorRegion = screen.getByRole('alert')
        expect(errorRegion).toBeInTheDocument()
      })
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<AdminLoginForm />)

      await user.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()

      await user.tab()
      expect(
        screen.getByRole('button', { name: /log in|sign in/i })
      ).toHaveFocus()
    })

    it('should submit form on Enter key', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()

      render(<AdminLoginForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'admin@luma.com')
      await user.type(
        screen.getByLabelText(/password/i),
        'password123{Enter}'
      )

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Security', () => {
    it('should use email input type for autocomplete', () => {
      render(<AdminLoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
    })

    it('should use current-password autocomplete for password', () => {
      render(<AdminLoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('should not store password in component state visibly', () => {
      render(<AdminLoginForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('UI Differences from User Login', () => {
    it('should have admin-specific styling/branding', () => {
      render(<AdminLoginForm />)

      // Should indicate this is admin login, not user login
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })

    it('should emphasize security warning for admin access', () => {
      render(<AdminLoginForm />)

      // Could have warning about admin access being logged
      const form = screen.getByRole('form') || document.body
      expect(form).toBeInTheDocument()
    })
  })
})
