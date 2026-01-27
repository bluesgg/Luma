// =============================================================================
// Register Form Component Tests (TDD)
// Components to test:
// - Email input field with validation
// - Password input with strength indicator
// - Confirm password field with match validation
// - Form submission with loading states
// - Error handling and display
// - Link to login page
// - Redirect to verification notice on success
// =============================================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const RegisterForm = () => <div>Register Form</div>

describe('RegisterForm Component', () => {
  describe('Rendering', () => {
    it('should render email, password, and confirm password fields', () => {
      render(<RegisterForm />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('should render password strength indicator', () => {
      render(<RegisterForm />)
      expect(screen.getByText(/password strength/i)).toBeInTheDocument()
    })

    it('should render terms and privacy policy links', () => {
      render(<RegisterForm />)
      expect(screen.getByText(/terms|privacy/i)).toBeInTheDocument()
    })
  })

  describe('Password Validation', () => {
    it('should show error for password less than 8 characters', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)
      await user.type(screen.getByLabelText(/^password/i), 'short')
      await user.tab()
      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('should show password strength as weak/medium/strong', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)
      const passwordInput = screen.getByLabelText(/^password/i)

      await user.type(passwordInput, '12345678')
      expect(screen.getByText(/weak/i)).toBeInTheDocument()

      await user.clear(passwordInput)
      await user.type(passwordInput, 'password123')
      expect(screen.getByText(/medium/i)).toBeInTheDocument()

      await user.clear(passwordInput)
      await user.type(passwordInput, 'P@ssw0rd123')
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  describe('Password Confirmation', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm/i), 'different123')
      await user.tab()
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should not show error when passwords match', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm/i), 'password123')
      await user.tab()
      expect(
        screen.queryByText(/passwords do not match/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with email and password', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm/i), 'password123')
      await user.click(
        screen.getByRole('button', { name: /register|sign up/i })
      )

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        })
      })
    })

    it('should show success message after registration', async () => {
      const handleSubmit = vi.fn().mockResolvedValue({ success: true })
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'user@example.com')
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm/i), 'password123')
      await user.click(
        screen.getByRole('button', { name: /register|sign up/i })
      )

      await waitFor(() => {
        expect(
          screen.getByText(/check your email|verification/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error for duplicate email', async () => {
      const handleSubmit = vi.fn().mockRejectedValue({
        message: 'Email already exists',
      })
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={handleSubmit} />)

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^password/i), 'password123')
      await user.type(screen.getByLabelText(/confirm/i), 'password123')
      await user.click(
        screen.getByRole('button', { name: /register|sign up/i })
      )

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })
    })
  })
})
