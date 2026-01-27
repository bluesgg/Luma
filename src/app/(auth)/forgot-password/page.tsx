import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Forgot Password - Luma',
  description: 'Reset your Luma password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Forgot password?</h2>
        <p className="mt-2 text-sm text-gray-600">
          No worries, we&apos;ll send you reset instructions
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
