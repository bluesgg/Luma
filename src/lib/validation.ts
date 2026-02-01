import { z } from 'zod';

/**
 * Validation schemas using Zod
 * Used for form validation and API request validation
 */

// Email validation schema
export const emailSchema = z.string().email('Invalid email address');

// Password validation schema with complexity requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character'
  );

// Registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Login schema (password doesn't need complexity validation on login)
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// Password reset request schema
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

// Password reset confirmation schema
export const confirmResetSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Email verification schema
export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: emailSchema,
});
