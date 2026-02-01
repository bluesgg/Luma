import React from 'react';
import { LoginForm } from '@/components/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Login | Luma',
  description: 'Sign in to your Luma account',
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground mt-1">
          Sign in to continue your learning journey
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
