// =============================================================================
// Password Strength Indicator Component Tests (TDD)
// =============================================================================

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const PasswordStrengthIndicator = ({ password }: { password: string }) => (
  <div>Password Strength</div>
)

describe('PasswordStrengthIndicator Component', () => {
  it('should show "weak" for short passwords', () => {
    render(<PasswordStrengthIndicator password="12345678" />)
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
  })

  it('should show "medium" for passwords with numbers and letters', () => {
    render(<PasswordStrengthIndicator password="password123" />)
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
  })

  it('should show "strong" for complex passwords', () => {
    render(<PasswordStrengthIndicator password="P@ssw0rd123" />)
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('should display progress bar with correct color', () => {
    const { container } = render(
      <PasswordStrengthIndicator password="P@ssw0rd123" />
    )
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toHaveClass(/green|success/)
  })

  it('should show criteria checklist', () => {
    render(<PasswordStrengthIndicator password="P@ssw0rd123" />)
    expect(screen.getByText(/8.*characters/i)).toBeInTheDocument()
    expect(screen.getByText(/uppercase/i)).toBeInTheDocument()
    expect(screen.getByText(/lowercase/i)).toBeInTheDocument()
    expect(screen.getByText(/number/i)).toBeInTheDocument()
    expect(screen.getByText(/special.*character/i)).toBeInTheDocument()
  })

  it('should check/uncheck criteria based on password', () => {
    const { rerender } = render(<PasswordStrengthIndicator password="pass" />)
    expect(screen.getByText(/8.*characters/i)).toHaveClass(/unchecked|false/)

    rerender(<PasswordStrengthIndicator password="password123" />)
    expect(screen.getByText(/8.*characters/i)).toHaveClass(/checked|true/)
  })

  it('should hide when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />)
    expect(container).toBeEmptyDOMElement()
  })
})
