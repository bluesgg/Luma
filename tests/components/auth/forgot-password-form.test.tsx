// =============================================================================
// Forgot Password Form Component Tests (TDD)
// =============================================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const ForgotPasswordForm = () => <div>Forgot Password Form</div>

describe('ForgotPasswordForm Component', () => {
  it('should render email input field', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm />)
    await user.type(screen.getByLabelText(/email/i), 'invalid')
    await user.click(screen.getByRole('button', { name: /send|reset/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('should show success message after submission', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<ForgotPasswordForm onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send|reset/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const handleSubmit = vi.fn(() => new Promise((r) => setTimeout(r, 100)))
    const user = userEvent.setup()
    render(<ForgotPasswordForm onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send|reset/i }))

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  it('should handle rate limit errors', async () => {
    const handleSubmit = vi.fn().mockRejectedValue({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
    })
    const user = userEvent.setup()
    render(<ForgotPasswordForm onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send|reset/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument()
    })
  })

  it('should have link back to login', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByText(/back to login|sign in/i)).toBeInTheDocument()
  })
})
