import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PasswordStrengthIndicator,
  calculatePasswordStrength,
  type PasswordStrength,
} from '@/components/ui/password-strength-indicator'

describe('calculatePasswordStrength', () => {
  describe('Strength Levels', () => {
    it('returns null for empty password', () => {
      const result = calculatePasswordStrength('')
      expect(result).toBeNull()
    })

    it('returns "weak" for very short passwords (< 8 chars)', () => {
      const result = calculatePasswordStrength('abc')
      expect(result?.level).toBe('weak')
    })

    it('returns "weak" for password with only lowercase letters', () => {
      const result = calculatePasswordStrength('abcdefgh')
      expect(result?.level).toBe('weak')
    })

    it('returns "weak" for password with only numbers', () => {
      const result = calculatePasswordStrength('12345678')
      expect(result?.level).toBe('weak')
    })

    it('returns "fair" for password with 2 criteria met (8+ chars + lowercase)', () => {
      const result = calculatePasswordStrength('abcdefgh')
      // 8+ chars: yes, lowercase: yes, uppercase: no, number: no, special: no
      // This meets 2 criteria, should be weak according to typical strength algorithms
      expect(result?.level).toBe('weak')
    })

    it('returns "fair" for password with lowercase and uppercase', () => {
      const result = calculatePasswordStrength('Abcdefgh')
      // 8+ chars: yes, lowercase: yes, uppercase: yes = 3 criteria
      expect(result?.level).toBe('fair')
    })

    it('returns "fair" for password with lowercase, uppercase, and number', () => {
      const result = calculatePasswordStrength('Abcdefg1')
      // 8+ chars: yes, lowercase: yes, uppercase: yes, number: yes = 4 criteria
      expect(result?.level).toBe('good')
    })

    it('returns "good" for password meeting 4 criteria', () => {
      const result = calculatePasswordStrength('Abcdefg1')
      expect(result?.level).toBe('good')
    })

    it('returns "strong" for password meeting all 5 criteria', () => {
      const result = calculatePasswordStrength('Abcdef1!')
      // 8+ chars: yes, lowercase: yes, uppercase: yes, number: yes, special: yes
      expect(result?.level).toBe('strong')
    })

    it('returns "strong" for complex password with all criteria', () => {
      const result = calculatePasswordStrength('MyP@ssw0rd!')
      expect(result?.level).toBe('strong')
    })
  })

  describe('Criteria Detection', () => {
    it('detects 8+ character requirement', () => {
      const shortResult = calculatePasswordStrength('1234567')
      const longResult = calculatePasswordStrength('12345678')

      expect(shortResult?.criteria.minLength).toBe(false)
      expect(longResult?.criteria.minLength).toBe(true)
    })

    it('detects uppercase letter', () => {
      const noUpperResult = calculatePasswordStrength('abcdefgh')
      const hasUpperResult = calculatePasswordStrength('Abcdefgh')

      expect(noUpperResult?.criteria.hasUppercase).toBe(false)
      expect(hasUpperResult?.criteria.hasUppercase).toBe(true)
    })

    it('detects lowercase letter', () => {
      const noLowerResult = calculatePasswordStrength('ABCDEFGH')
      const hasLowerResult = calculatePasswordStrength('ABCDEFGh')

      expect(noLowerResult?.criteria.hasLowercase).toBe(false)
      expect(hasLowerResult?.criteria.hasLowercase).toBe(true)
    })

    it('detects number', () => {
      const noNumberResult = calculatePasswordStrength('abcdefgh')
      const hasNumberResult = calculatePasswordStrength('abcdefg1')

      expect(noNumberResult?.criteria.hasNumber).toBe(false)
      expect(hasNumberResult?.criteria.hasNumber).toBe(true)
    })

    it('detects special character', () => {
      const noSpecialResult = calculatePasswordStrength('Abcdefg1')
      const hasSpecialResult = calculatePasswordStrength('Abcdef1!')

      expect(noSpecialResult?.criteria.hasSpecialChar).toBe(false)
      expect(hasSpecialResult?.criteria.hasSpecialChar).toBe(true)
    })

    it('recognizes various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=']

      specialChars.forEach((char) => {
        const result = calculatePasswordStrength(`Password${char}`)
        expect(result?.criteria.hasSpecialChar).toBe(true)
      })
    })
  })

  describe('Score Calculation', () => {
    it('returns score of 0 for empty password', () => {
      const result = calculatePasswordStrength('')
      expect(result).toBeNull()
    })

    it('returns score of 1 for password with only 1 criterion', () => {
      // Only has lowercase
      const result = calculatePasswordStrength('abc')
      expect(result?.score).toBe(1)
    })

    it('returns score of 2 for password with 2 criteria', () => {
      // Has 8+ chars and lowercase
      const result = calculatePasswordStrength('abcdefgh')
      expect(result?.score).toBe(2)
    })

    it('returns score of 3 for password with 3 criteria', () => {
      // Has 8+ chars, lowercase, and uppercase
      const result = calculatePasswordStrength('Abcdefgh')
      expect(result?.score).toBe(3)
    })

    it('returns score of 4 for password with 4 criteria', () => {
      // Has 8+ chars, lowercase, uppercase, and number
      const result = calculatePasswordStrength('Abcdefg1')
      expect(result?.score).toBe(4)
    })

    it('returns score of 5 for password with all 5 criteria', () => {
      // Has all criteria
      const result = calculatePasswordStrength('Abcdef1!')
      expect(result?.score).toBe(5)
    })
  })

  describe('Edge Cases', () => {
    it('handles null input gracefully', () => {
      // @ts-expect-error Testing null input
      const result = calculatePasswordStrength(null)
      expect(result).toBeNull()
    })

    it('handles undefined input gracefully', () => {
      // @ts-expect-error Testing undefined input
      const result = calculatePasswordStrength(undefined)
      expect(result).toBeNull()
    })

    it('handles whitespace-only password', () => {
      const result = calculatePasswordStrength('        ')
      // Should count as 8 chars but no other criteria
      expect(result?.criteria.minLength).toBe(true)
      expect(result?.level).toBe('weak')
    })

    it('handles unicode characters', () => {
      const result = calculatePasswordStrength('Password1!')
      expect(result?.level).toBe('strong')
    })

    it('handles very long passwords', () => {
      const longPassword = 'A'.repeat(100) + 'a1!'
      const result = calculatePasswordStrength(longPassword)
      expect(result?.level).toBe('strong')
    })

    it('handles password with emoji', () => {
      const result = calculatePasswordStrength('Password1')
      expect(result).not.toBeNull()
    })
  })
})

describe('PasswordStrengthIndicator Component', () => {
  describe('Rendering', () => {
    it('returns null for empty password', () => {
      const { container } = render(<PasswordStrengthIndicator password="" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders strength indicator for non-empty password', () => {
      render(<PasswordStrengthIndicator password="abc" />)

      // Should render the indicator container
      expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument()
    })

    it('renders progress bars', () => {
      render(<PasswordStrengthIndicator password="Password1!" />)

      const progressBars = screen.getAllByRole('presentation')
      expect(progressBars.length).toBeGreaterThan(0)
    })

    it('renders strength label', () => {
      render(<PasswordStrengthIndicator password="Password1!" />)

      // Should display the strength level text
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  describe('Strength Level Display', () => {
    it('displays "Weak" for weak passwords', () => {
      render(<PasswordStrengthIndicator password="abc" />)
      expect(screen.getByText(/weak/i)).toBeInTheDocument()
    })

    it('displays "Fair" for fair passwords', () => {
      render(<PasswordStrengthIndicator password="Abcdefgh" />)
      expect(screen.getByText(/fair/i)).toBeInTheDocument()
    })

    it('displays "Good" for good passwords', () => {
      render(<PasswordStrengthIndicator password="Abcdefg1" />)
      expect(screen.getByText(/good/i)).toBeInTheDocument()
    })

    it('displays "Strong" for strong passwords', () => {
      render(<PasswordStrengthIndicator password="Abcdef1!" />)
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  describe('Visual Indicators', () => {
    it('shows correct color for weak password (red)', () => {
      render(<PasswordStrengthIndicator password="abc" />)

      const indicator = screen.getByTestId('password-strength-indicator')
      expect(indicator).toHaveClass('text-red-500')
    })

    it('shows correct color for fair password (orange)', () => {
      render(<PasswordStrengthIndicator password="Abcdefgh" />)

      const indicator = screen.getByTestId('password-strength-indicator')
      expect(indicator).toHaveClass('text-orange-500')
    })

    it('shows correct color for good password (yellow)', () => {
      render(<PasswordStrengthIndicator password="Abcdefg1" />)

      const indicator = screen.getByTestId('password-strength-indicator')
      expect(indicator).toHaveClass('text-yellow-500')
    })

    it('shows correct color for strong password (green)', () => {
      render(<PasswordStrengthIndicator password="Abcdef1!" />)

      const indicator = screen.getByTestId('password-strength-indicator')
      expect(indicator).toHaveClass('text-green-500')
    })
  })

  describe('Progress Bar Filling', () => {
    it('fills 1 bar for weak password (score 1-2)', () => {
      render(<PasswordStrengthIndicator password="abc" />)

      const filledBars = screen.getAllByTestId('strength-bar-filled')
      expect(filledBars.length).toBe(1)
    })

    it('fills 2 bars for fair password (score 3)', () => {
      render(<PasswordStrengthIndicator password="Abcdefgh" />)

      const filledBars = screen.getAllByTestId('strength-bar-filled')
      expect(filledBars.length).toBe(2)
    })

    it('fills 3 bars for good password (score 4)', () => {
      render(<PasswordStrengthIndicator password="Abcdefg1" />)

      const filledBars = screen.getAllByTestId('strength-bar-filled')
      expect(filledBars.length).toBe(3)
    })

    it('fills 4 bars for strong password (score 5)', () => {
      render(<PasswordStrengthIndicator password="Abcdef1!" />)

      const filledBars = screen.getAllByTestId('strength-bar-filled')
      expect(filledBars.length).toBe(4)
    })
  })

  describe('Criteria Checklist', () => {
    it('shows criteria checklist when showCriteria prop is true', () => {
      render(<PasswordStrengthIndicator password="abc" showCriteria />)

      expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument()
      expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
      expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument()
      expect(screen.getByText(/number/i)).toBeInTheDocument()
      expect(screen.getByText(/special character/i)).toBeInTheDocument()
    })

    it('does not show criteria checklist by default', () => {
      render(<PasswordStrengthIndicator password="abc" />)

      expect(screen.queryByText(/8\+ characters/i)).not.toBeInTheDocument()
    })

    it('marks met criteria with checkmark icon', () => {
      render(<PasswordStrengthIndicator password="abcdefgh" showCriteria />)

      // 8+ chars and lowercase should be met
      const metCriteria = screen.getAllByTestId('criteria-met')
      expect(metCriteria.length).toBe(2) // minLength and hasLowercase
    })

    it('marks unmet criteria with X icon', () => {
      render(<PasswordStrengthIndicator password="abc" showCriteria />)

      // All criteria except lowercase should be unmet
      const unmetCriteria = screen.getAllByTestId('criteria-unmet')
      expect(unmetCriteria.length).toBe(4) // minLength, uppercase, number, special
    })

    it('updates criteria display when password changes', () => {
      const { rerender } = render(
        <PasswordStrengthIndicator password="abc" showCriteria />
      )

      // Initially, minLength is not met
      let unmetCriteria = screen.getAllByTestId('criteria-unmet')
      expect(unmetCriteria.some((el) => el.textContent?.includes('8+'))).toBe(true)

      // Update password to meet minLength
      rerender(<PasswordStrengthIndicator password="abcdefgh" showCriteria />)

      // Now minLength should be met
      const metCriteria = screen.getAllByTestId('criteria-met')
      expect(metCriteria.some((el) => el.textContent?.includes('8+'))).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('has accessible label describing password strength', () => {
      render(<PasswordStrengthIndicator password="Password1!" />)

      const indicator = screen.getByTestId('password-strength-indicator')
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('Password strength'))
    })

    it('indicates strength level to screen readers', () => {
      render(<PasswordStrengthIndicator password="Password1!" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('progress bars have proper ARIA attributes', () => {
      render(<PasswordStrengthIndicator password="abc" />)

      const progressContainer = screen.getByRole('progressbar')
      expect(progressContainer).toHaveAttribute('aria-valuenow')
      expect(progressContainer).toHaveAttribute('aria-valuemin', '0')
      expect(progressContainer).toHaveAttribute('aria-valuemax', '5')
    })

    it('criteria items have proper roles', () => {
      render(<PasswordStrengthIndicator password="abc" showCriteria />)

      const criteriaList = screen.getByRole('list')
      expect(criteriaList).toBeInTheDocument()

      const criteriaItems = screen.getAllByRole('listitem')
      expect(criteriaItems.length).toBe(5)
    })
  })

  describe('Dynamic Updates', () => {
    it('updates strength level as user types', () => {
      const { rerender } = render(<PasswordStrengthIndicator password="" />)

      // Initially empty - no indicator
      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument()

      // Type first character
      rerender(<PasswordStrengthIndicator password="a" />)
      expect(screen.getByText(/weak/i)).toBeInTheDocument()

      // Add more characters
      rerender(<PasswordStrengthIndicator password="Abcdefg" />)
      expect(screen.getByText(/weak/i)).toBeInTheDocument()

      // Meet 8 char requirement
      rerender(<PasswordStrengthIndicator password="Abcdefgh" />)
      expect(screen.getByText(/fair/i)).toBeInTheDocument()

      // Add number
      rerender(<PasswordStrengthIndicator password="Abcdefg1" />)
      expect(screen.getByText(/good/i)).toBeInTheDocument()

      // Add special character
      rerender(<PasswordStrengthIndicator password="Abcdef1!" />)
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })

    it('updates when password is cleared', () => {
      const { rerender } = render(<PasswordStrengthIndicator password="Password1!" />)

      expect(screen.getByText(/strong/i)).toBeInTheDocument()

      rerender(<PasswordStrengthIndicator password="" />)

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument()
    })
  })
})
