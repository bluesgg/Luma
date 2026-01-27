import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Luma - AI-Powered Learning Platform',
  description:
    'AI-powered learning management system designed for university students',
  keywords: ['learning', 'AI', 'education', 'university', 'study'],
  authors: [{ name: 'Luma Team' }],
  creator: 'Luma Team',
  publisher: 'Luma',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Luma',
    title: 'Luma - AI-Powered Learning Platform',
    description:
      'AI-powered learning management system designed for university students',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luma - AI-Powered Learning Platform',
    description:
      'AI-powered learning management system designed for university students',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}
