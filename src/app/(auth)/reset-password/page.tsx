import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordContent } from './reset-password-content'
import { BookOpen, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Reset Password - Luma',
  description: 'Reset your Luma account password.',
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {/* Branding */}
      <div className="mb-8 flex items-center gap-2">
        <BookOpen className="h-8 w-8 text-indigo-600" aria-hidden="true" />
        <span className="font-heading text-3xl font-bold text-slate-800">Luma</span>
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <ResetPasswordContent />
      </Suspense>

      {/* Footer */}
      <p className="mt-8 text-sm text-slate-500">
        AI-Powered PDF Learning Assistant
      </p>
    </div>
  )
}
