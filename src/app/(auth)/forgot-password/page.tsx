import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Forgot Password - Luma',
  description: 'Reset your Luma account password.',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {/* Branding */}
      <div className="mb-8 flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-indigo-600" aria-hidden="true" />
        <span className="font-heading text-3xl font-bold text-slate-800">Luma</span>
      </div>

      <ForgotPasswordForm />

      {/* Footer */}
      <p className="mt-8 text-sm text-slate-500">
        AI-Powered PDF Learning Assistant
      </p>
    </div>
  )
}
