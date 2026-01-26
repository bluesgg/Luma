'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

export function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (!token) {
    return (
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="font-heading text-2xl font-bold text-slate-800">
            Invalid link
          </CardTitle>
          <CardDescription className="text-slate-600">
            The password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Invalid or missing reset token. Please request a new password
              reset link.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            className="w-full cursor-pointer bg-indigo-600 transition-colors duration-200 hover:bg-indigo-700"
            asChild
          >
            <Link href="/forgot-password">Request new link</Link>
          </Button>
          <div className="text-center text-sm text-slate-500">
            <Link
              href="/login"
              className="text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return <ResetPasswordForm token={token} />
}
