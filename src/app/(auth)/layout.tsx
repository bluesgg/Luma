import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Luma
            </h1>
          </Link>
          <p className="text-muted-foreground mt-2">
            AI-powered learning management system
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-card rounded-lg shadow-lg border p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Luma. All rights reserved.
          </p>
          <div className="mt-2 space-x-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
