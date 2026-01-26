'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
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

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { getHeaders, isLoading: isCsrfLoading, error: csrfError } = useCsrf()

  const isSubmitDisabled = isLoading || isCsrfLoading

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const watchedPassword = form.watch('password')

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Registration failed. Please try again.')
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="font-heading text-2xl font-bold text-slate-800">
            Check your email
          </CardTitle>
          <CardDescription className="text-slate-600">
            We&apos;ve sent you a verification link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-indigo-200 bg-indigo-50 text-indigo-700">
            <AlertDescription>
              Please check your email and click the verification link to activate
              your account. The link will expire in 24 hours.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-slate-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <Link
              href="/resend-verification"
              className="text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline"
            >
              request a new link
            </Link>
            .
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full cursor-pointer transition-colors duration-200"
            asChild
          >
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-2xl font-bold text-slate-800">
          Create an account
        </CardTitle>
        <CardDescription className="text-slate-600">
          Enter your email and create a password to get started
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Email</FormLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Password</FormLabel>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Create a password"
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
                  <FormLabel className="text-slate-700">Confirm password</FormLabel>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
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
              {isLoading ? 'Creating account...' : isCsrfLoading ? 'Loading...' : 'Create account'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-slate-500">
          Already have an account?{' '}
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
