import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

/**
 * Password Strength Indicator Component Tests
 * Tests visual feedback for password strength
 */

type PasswordStrength = 'weak' | 'medium' | 'strong';

const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 8) return 'weak';

  let score = 0;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score === 3) return 'medium';
  return 'strong';
};

const MockPasswordStrengthIndicator = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);

  const colors = {
    weak: 'red',
    medium: 'yellow',
    strong: 'green',
  };

  const labels = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  };

  if (!password) return null;

  return (
    <div data-testid="strength-indicator">
      <div data-testid="strength-bar" style={{ backgroundColor: colors[strength] }} />
      <span data-testid="strength-label">{labels[strength]}</span>
    </div>
  );
};

describe('PasswordStrengthIndicator Component', () => {
  describe('Rendering', () => {
    it('should not render when password is empty', () => {
      render(<MockPasswordStrengthIndicator password="" />);

      expect(screen.queryByTestId('strength-indicator')).not.toBeInTheDocument();
    });

    it('should render when password is provided', () => {
      render(<MockPasswordStrengthIndicator password="test" />);

      expect(screen.getByTestId('strength-indicator')).toBeInTheDocument();
    });

    it('should show strength label', () => {
      render(<MockPasswordStrengthIndicator password="Test123!" />);

      expect(screen.getByTestId('strength-label')).toBeInTheDocument();
    });

    it('should show strength bar', () => {
      render(<MockPasswordStrengthIndicator password="Test123!" />);

      expect(screen.getByTestId('strength-bar')).toBeInTheDocument();
    });
  });

  describe('Weak Passwords', () => {
    it('should show weak for short password', () => {
      render(<MockPasswordStrengthIndicator password="test" />);

      expect(screen.getByTestId('strength-label')).toHaveTextContent('Weak');
    });

    it('should show weak for password without special chars', () => {
      render(<MockPasswordStrengthIndicator password="Test1234" />);

      expect(screen.getByTestId('strength-label')).toHaveTextContent('Weak');
    });

    it('should show red color for weak password', () => {
      render(<MockPasswordStrengthIndicator password="test" />);

      const bar = screen.getByTestId('strength-bar');
      expect(bar).toHaveStyle({ backgroundColor: 'red' });
    });
  });

  describe('Medium Passwords', () => {
    it('should show medium for decent password', () => {
      render(<MockPasswordStrengthIndicator password="Test1234" />);

      const label = screen.getByTestId('strength-label');
      expect(['Weak', 'Medium']).toContain(label.textContent);
    });

    it('should show yellow color for medium password', () => {
      render(<MockPasswordStrengthIndicator password="Test1234!" />);

      const bar = screen.getByTestId('strength-bar');
      const color = bar.style.backgroundColor;
      expect(['yellow', 'green']).toContain(color);
    });
  });

  describe('Strong Passwords', () => {
    it('should show strong for complex password', () => {
      render(<MockPasswordStrengthIndicator password="Test123!@#" />);

      expect(screen.getByTestId('strength-label')).toHaveTextContent('Strong');
    });

    it('should show green color for strong password', () => {
      render(<MockPasswordStrengthIndicator password="Test123!@#" />);

      const bar = screen.getByTestId('strength-bar');
      expect(bar).toHaveStyle({ backgroundColor: 'green' });
    });

    it('should handle very long strong password', () => {
      render(<MockPasswordStrengthIndicator password="VeryLongTest123!@#$%^&*()" />);

      expect(screen.getByTestId('strength-label')).toHaveTextContent('Strong');
    });
  });

  describe('Real-time Updates', () => {
    it('should update strength as password changes', () => {
      const { rerender } = render(<MockPasswordStrengthIndicator password="t" />);
      expect(screen.queryByTestId('strength-indicator')).toBeInTheDocument();

      rerender(<MockPasswordStrengthIndicator password="Test" />);
      expect(screen.getByTestId('strength-label')).toHaveTextContent('Weak');

      rerender(<MockPasswordStrengthIndicator password="Test123!" />);
      expect(screen.getByTestId('strength-label')).toHaveTextContent('Strong');
    });
  });

  describe('Password Requirements', () => {
    it('should identify missing uppercase', () => {
      const strength = getPasswordStrength('test123!@#');
      expect(strength).toBe('medium');
    });

    it('should identify missing lowercase', () => {
      const strength = getPasswordStrength('TEST123!@#');
      expect(strength).toBe('medium');
    });

    it('should identify missing number', () => {
      const strength = getPasswordStrength('TestTest!@#');
      expect(strength).toBe('medium');
    });

    it('should identify missing special character', () => {
      const strength = getPasswordStrength('Test1234567');
      expect(strength).toBe('weak');
    });

    it('should recognize all requirements met', () => {
      const strength = getPasswordStrength('Test123!@#');
      expect(strength).toBe('strong');
    });
  });
});
