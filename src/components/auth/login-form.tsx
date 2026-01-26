'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { useCsrf } from '@/hooks/use-csrf'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const router = useRouter()
  const { getHeaders, isLoading: isCsrfLoading, error: csrfError } = useCsrf()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)
    setErrorCode(null)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify(data),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error.message)
        setErrorCode(result.error.code)
        return
      }

      router.push('/courses')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendVerification() {
    const email = form.getValues('email')
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    setIsResending(true)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error.message)
        return
      }

      setResendSuccess(true)
      setError(null)
      setErrorCode(null)
    } catch {
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const isSubmitDisabled = isLoading || isCsrfLoading

  return (
    <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-2xl font-bold text-slate-800">
          Sign in
        </CardTitle>
        <CardDescription className="text-slate-600">
          Enter your email and password to access your account
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
        {resendSuccess && (
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-700" role="status">
            <AlertDescription>
              Verification email sent! Please check your inbox.
            </AlertDescription>
          </Alert>
        )}
        {errorCode === 'AUTH_EMAIL_NOT_VERIFIED' && (
          <p className="mb-4 text-sm">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend verification email'}
            </button>
          </p>
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
                        placeholder="Enter your password"
                        autoComplete="current-password"
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
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitDisabled}
                      className="transition-colors duration-200"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer font-normal text-slate-600">
                      Remember me
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full cursor-pointer bg-indigo-600 transition-colors duration-200 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={isSubmitDisabled}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isLoading ? 'Signing in...' : isCsrfLoading ? 'Loading...' : 'Sign in'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link
          href="/forgot-password"
          className="text-sm text-slate-500 transition-colors duration-200 hover:text-indigo-600 hover:underline"
        >
          Forgot your password?
        </Link>
        <div className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-indigo-600 transition-colors duration-200 hover:text-indigo-700 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
