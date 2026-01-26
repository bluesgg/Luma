'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { getHeaders, isLoading: isCsrfLoading, error: csrfError } = useCsrf()

  const isSubmitDisabled = isLoading || isCsrfLoading

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          email: data.email.trim(),
        }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to send reset email. Please try again.')
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Forgot password error:', err)
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
            We&apos;ve sent you a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" role="status" aria-live="polite">
          <Alert className="border-indigo-200 bg-indigo-50 text-indigo-700">
            <AlertDescription>
              If an account exists with that email, you will receive a password
              reset link. The link will expire in 24 hours.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-slate-500">
            Didn&apos;t receive the email? Check your spam folder or try again
            with a different email address.
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
          Forgot password
        </CardTitle>
        <CardDescription className="text-slate-600">
          Enter your email address and we&apos;ll send you a reset link
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
            <Button
              type="submit"
              className="w-full cursor-pointer bg-indigo-600 transition-colors duration-200 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={isSubmitDisabled}
            >
              {(isLoading || isCsrfLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isLoading ? 'Sending...' : isCsrfLoading ? 'Loading...' : 'Send reset link'}
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
