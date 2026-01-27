import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Luma
            </span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            AI-powered learning management system designed for university
            students. Organize courses, upload PDFs, and receive interactive AI
            tutoring.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Course Management</CardTitle>
                <CardDescription>
                  Organize your learning materials by course
                </CardDescription>
              </CardHeader>
              <CardContent>
                Create and manage up to 6 courses. Upload lecture PDFs and keep
                your study materials organized in one place.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Interactive Tutor</CardTitle>
                <CardDescription>
                  Get personalized explanations on any topic
                </CardDescription>
              </CardHeader>
              <CardContent>
                AI analyzes your PDFs to extract knowledge structure and
                provides five-layer explanations from motivation to application.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Knowledge Testing</CardTitle>
                <CardDescription>
                  Verify understanding with AI-generated tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                After learning each topic, take automatically generated tests to
                confirm your understanding and track weak points.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Tracking</CardTitle>
                <CardDescription>Monitor your learning journey</CardDescription>
              </CardHeader>
              <CardContent>
                See your progress through each course, track completed topics,
                and identify areas that need more attention.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formula Recognition</CardTitle>
                <CardDescription>
                  LaTeX rendering for mathematical content
                </CardDescription>
              </CardHeader>
              <CardContent>
                Mathpix integration automatically recognizes and renders
                formulas from your PDFs in beautiful LaTeX format.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Smart Quota System</CardTitle>
                <CardDescription>
                  Fair usage with monthly quotas
                </CardDescription>
              </CardHeader>
              <CardContent>
                150 learning interactions per month to ensure sustainable
                service. Quotas reset monthly based on your registration date.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Luma. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
