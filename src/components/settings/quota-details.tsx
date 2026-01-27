'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QuotaWarning } from '@/components/quota'
import { useQuota } from '@/hooks'
import { AlertCircle } from 'lucide-react'

export function QuotaDetails() {
  const { data, isLoading, error } = useQuota()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quota Usage</CardTitle>
          <CardDescription>Monitor your monthly usage limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quota Usage</CardTitle>
          <CardDescription>Monitor your monthly usage limits</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load quota information. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quota Usage</CardTitle>
        <CardDescription>
          Monitor your monthly usage limits. Quotas reset on the first of each
          month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Learning Interactions Quota */}
        <div>
          <h3 className="mb-3 text-sm font-medium">Learning Interactions</h3>
          <QuotaWarning
            used={data.learningInteractions.used}
            limit={data.learningInteractions.limit}
            resetAt={data.learningInteractions.resetAt}
            bucketName="Learning Interactions"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Includes AI-generated questions, explanations, and learning session
            interactions.
          </p>
        </div>

        {/* Auto Explain Quota */}
        <div>
          <h3 className="mb-3 text-sm font-medium">Auto Explain</h3>
          <QuotaWarning
            used={data.autoExplain.used}
            limit={data.autoExplain.limit}
            resetAt={data.autoExplain.resetAt}
            bucketName="Auto Explain"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Automatic explanations for complex topics and concepts in your
            learning materials.
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertDescription className="text-sm">
            Your quotas reset monthly on the 1st. If you need higher limits,
            contact support.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
