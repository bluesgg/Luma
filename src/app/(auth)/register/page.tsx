import React from 'react';
import { RegisterForm } from '@/components/auth';

export const metadata = {
  title: 'Create Account | Luma',
  description: 'Create your Luma account',
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Create an account</h2>
        <p className="text-muted-foreground mt-1">
          Get started with AI-powered learning
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
