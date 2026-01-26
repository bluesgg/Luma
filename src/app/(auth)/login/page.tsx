import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign In - Luma',
  description: 'Sign in to your Luma account to access AI-powered PDF learning.',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {/* Branding */}
      <div className="mb-8 flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-indigo-600" aria-hidden="true" />
        <span className="font-heading text-3xl font-bold text-slate-800">Luma</span>
      </div>

      <LoginForm />

      {/* Footer */}
      <p className="mt-8 text-sm text-slate-500">
        AI-Powered PDF Learning Assistant
      </p>
    </div>
  )
}
