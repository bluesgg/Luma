import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Register - Luma',
  description: 'Create your Luma account',
}

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Get started with Luma today
        </p>
      </div>

      <RegisterForm />
    </div>
  )
}
