'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator'
import { useCsrf } from '@/hooks/use-csrf'
import { AUTH } from '@/lib/constants'

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const router = useRouter()
  const { getHeaders, isLoading: isCsrfLoading, error: csrfError } = useCsrf()

  const isSubmitDisabled = isLoading || isCsrfLoading

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const watchedPassword = form.watch('password')

  // Redirect countdown after success
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (success && countdown === 0) {
      router.push('/login')
    }
  }, [success, countdown, router])

  async function onSubmit(data: ResetPasswordFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to reset password. Please try again.')
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
          </div>
          <CardTitle className="font-heading text-center text-2xl font-bold text-slate-800">
            Password updated
          </CardTitle>
          <CardDescription className="text-center text-slate-600">
            Your password has been successfully reset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" role="status" aria-live="polite">
          <Alert className="border-green-200 bg-green-50 text-green-700">
            <AlertDescription>
              You can now sign in with your new password. Redirecting to login
              in {countdown} seconds...
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full cursor-pointer transition-colors duration-200"
            asChild
          >
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-2xl font-bold text-slate-800">
          Reset password
        </CardTitle>
        <CardDescription className="text-slate-600">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        {csrfError && (
          <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 text-red-700" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Security token failed to load. Please refresh the page.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 text-red-700" role="alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {error}
              {error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid') ? (
                <span>
                  {' '}
                  <Link
                    href="/forgot-password"
                    className="font-medium underline hover:text-red-800"
                  >
                    Request a new link
                  </Link>
                </span>
              ) : null}
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">New password</FormLabel>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your new password"
                        autoComplete="new-password"
                        disabled={isSubmitDisabled}
                        className="pl-10 transition-colors duration-200 focus:ring-2 focus:ring-indigo-500"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormDescription className="text-slate-500">
                    Must be at least {AUTH.PASSWORD_MIN_LENGTH} characters
                  </FormDescription>
                  {watchedPassword && (
                    <PasswordStrengthIndicator password={watchedPassword} showCriteria />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Confirm new password</FormLabel>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                        disabled={isSubmitDisabled}
                        className="pl-10 transition-colors duration-200 focus:ring-2 focus:ring-indigo-500"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full cursor-pointer bg-indigo-600 transition-colors duration-200 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={isSubmitDisabled}
            >
              {(isLoading || isCsrfLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isLoading ? 'Resetting...' : isCsrfLoading ? 'Loading...' : 'Reset password'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-slate-500">
          Remember your password?{' '}
          <Link
            href="/login"
            className="text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
