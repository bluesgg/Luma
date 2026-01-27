// =============================================================================
// Reset Password Form Component Tests (TDD)
// =============================================================================

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const ResetPasswordForm = ({ token }: { token: string }) => (
  <div>Reset Password Form</div>
)

describe('ResetPasswordForm Component', () => {
  it('should render new password and confirm password fields', () => {
    render(<ResetPasswordForm token="valid-token" />)
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('should validate token on mount', async () => {
    render(<ResetPasswordForm token="invalid-token" />)
    await waitFor(() => {
      expect(screen.getByText(/invalid.*token|expired/i)).toBeInTheDocument()
    })
  })

  it('should show password strength indicator', () => {
    render(<ResetPasswordForm token="valid-token" />)
    expect(screen.getByText(/password strength/i)).toBeInTheDocument()
  })

  it('should validate password length', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm token="valid-token" />)
    await user.type(screen.getByLabelText(/new password/i), 'short')
    await user.tab()
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup()
    render(<ResetPasswordForm token="valid-token" />)
    await user.type(screen.getByLabelText(/new password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm/i), 'different123')
    await user.tab()
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('should submit with token and new password', async () => {
    const handleSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ResetPasswordForm token="valid-token" onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
    await user.type(screen.getByLabelText(/confirm/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /reset|submit/i }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        token: 'valid-token',
        password: 'newpassword123',
      })
    })
  })

  it('should redirect to login after successful reset', async () => {
    const handleSubmit = vi.fn().mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<ResetPasswordForm token="valid-token" onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
    await user.type(screen.getByLabelText(/confirm/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /reset|submit/i }))

    await waitFor(() => {
      expect(screen.getByText(/password reset.*success/i)).toBeInTheDocument()
    })
  })

  it('should handle expired token error', async () => {
    const handleSubmit = vi.fn().mockRejectedValue({
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Reset link has expired',
    })
    const user = userEvent.setup()
    render(<ResetPasswordForm token="expired-token" onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
    await user.type(screen.getByLabelText(/confirm/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /reset|submit/i }))

    await waitFor(() => {
      expect(screen.getByText(/expired.*request.*new/i)).toBeInTheDocument()
    })
  })
})
