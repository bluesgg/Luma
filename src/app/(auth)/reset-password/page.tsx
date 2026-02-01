import React from 'react';
import { ResetPasswordForm } from '@/components/auth';

export const metadata = {
  title: 'Reset Password | Luma',
  description: 'Reset your Luma account password',
};

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Reset password</h2>
        <p className="text-muted-foreground mt-1">
          Enter your new password below
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
