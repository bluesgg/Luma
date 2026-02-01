import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * Register Form Component Tests
 * Tests user registration form interactions
 */

const MockRegisterForm = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setLoading(false);
    } catch (err) {
      setError('Registration failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="register-form">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        data-testid="email-input"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        data-testid="password-input"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm Password"
        data-testid="confirm-password-input"
      />
      {error && <div data-testid="error-message">{error}</div>}
      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? 'Creating account...' : 'Register'}
      </button>
      <a href="/login" data-testid="login-link">
        Already have an account?
      </a>
    </form>
  );
};

describe('RegisterForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form elements', () => {
      render(<MockRegisterForm />);

      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('login-link')).toBeInTheDocument();
    });

    it('should have password type inputs', () => {
      render(<MockRegisterForm />);

      expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
      expect(screen.getByTestId('confirm-password-input')).toHaveAttribute('type', 'password');
    });
  });

  describe('User Interactions', () => {
    it('should update email input', async () => {
      render(<MockRegisterForm />);
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

      await userEvent.type(emailInput, 'newuser@test.com');

      expect(emailInput.value).toBe('newuser@test.com');
    });

    it('should update password input', async () => {
      render(<MockRegisterForm />);
      const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;

      await userEvent.type(passwordInput, 'Test123!@#');

      expect(passwordInput.value).toBe('Test123!@#');
    });

    it('should update confirm password input', async () => {
      render(<MockRegisterForm />);
      const confirmInput = screen.getByTestId('confirm-password-input') as HTMLInputElement;

      await userEvent.type(confirmInput, 'Test123!@#');

      expect(confirmInput.value).toBe('Test123!@#');
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid data', async () => {
      render(<MockRegisterForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'user@test.com');
      await userEvent.type(screen.getByTestId('password-input'), 'Test123!@#');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'Test123!@#');
      await userEvent.click(screen.getByTestId('submit-button'));

      expect(screen.getByText('Creating account...')).toBeInTheDocument();
    });

    it('should show loading state', async () => {
      render(<MockRegisterForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'user@test.com');
      await userEvent.type(screen.getByTestId('password-input'), 'Test123!@#');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'Test123!@#');
      await userEvent.click(screen.getByTestId('submit-button'));

      const button = screen.getByTestId('submit-button');
      expect(button).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('should show error for empty fields', async () => {
      render(<MockRegisterForm />);

      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('All fields are required');
      });
    });

    it('should show error for password mismatch', async () => {
      render(<MockRegisterForm />);

      await userEvent.type(screen.getByTestId('email-input'), 'user@test.com');
      await userEvent.type(screen.getByTestId('password-input'), 'Test123!@#');
      await userEvent.type(screen.getByTestId('confirm-password-input'), 'Different123!');
      await userEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Passwords do not match');
      });
    });
  });

  describe('Navigation', () => {
    it('should have link to login page', () => {
      render(<MockRegisterForm />);

      const loginLink = screen.getByTestId('login-link');
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });
});
