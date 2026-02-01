import React from 'react';
import { ForgotPasswordForm } from '@/components/auth';

export const metadata = {
  title: 'Forgot Password | Luma',
  description: 'Reset your Luma account password',
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Forgot password?</h2>
        <p className="text-muted-foreground mt-1">
          No worries, we&apos;ll send you reset instructions
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
