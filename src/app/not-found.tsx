import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * 404 Not Found page
 * Shown when a route doesn't exist
 */

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-4xl">404</CardTitle>
          <CardDescription className="text-lg">Page not found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It
            might have been moved or deleted.
          </p>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/courses">View courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
