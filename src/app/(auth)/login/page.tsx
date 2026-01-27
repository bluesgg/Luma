import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Login - Luma',
  description: 'Log in to your Luma account',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; redirect?: string }>
}) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      {params.verified === 'true' && (
        <Alert>
          <AlertDescription>
            Email verified successfully! You can now log in.
          </AlertDescription>
        </Alert>
      )}
      {params.verified === 'false' && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to verify email. The link may be invalid or expired.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="mt-2 text-sm text-gray-600">
          Log in to your account to continue
        </p>
      </div>

      <LoginForm />
    </div>
  )
}
