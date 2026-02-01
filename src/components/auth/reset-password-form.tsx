'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmResetSchema } from '@/lib/validation';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCsrf } from '@/hooks/use-csrf';import { PasswordStrengthIndicator } from './password-strength-indicator';

type ResetPasswordFormData = z.infer<typeof confirmResetSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const { csrfToken } = useCsrf();  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(confirmResetSchema),
    defaultValues: {
      token: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setValue('token', tokenParam);
    } else {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || 'Password reset failed. Please try again.');
        return;
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Loading reset token...
        </AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Password reset successful! Redirecting to login...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <input type="hidden" {...register('token')} />

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a strong password"
          {...register('password')}
          disabled={isLoading || !token}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <PasswordStrengthIndicator password={password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          {...register('confirmPassword')}
          disabled={isLoading || !token}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !token}>
        {isLoading ? 'Resetting password...' : 'Reset password'}
      </Button>

      <div className="text-center text-sm">
        Remember your password?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  );
}
