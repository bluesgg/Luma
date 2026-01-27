'use client'

import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface QuotaWarningProps {
  used: number
  limit: number
  resetAt: Date | string // Accept both Date and string for flexibility
  bucketName?: string
}

export function QuotaWarning({
  used,
  limit,
  resetAt,
  bucketName = 'Quota',
}: QuotaWarningProps) {
  const percentage = Math.round((used / limit) * 100)
  const remaining = limit - used
  const isExhausted = used >= limit
  const isLow = percentage > 90
  const [isTooltipOpen, setIsTooltipOpen] = React.useState(false)

  // Keyboard event handler for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Open tooltip on Enter or Space key
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsTooltipOpen(!isTooltipOpen)
    }
    // Close on Escape
    if (event.key === 'Escape') {
      setIsTooltipOpen(false)
    }
  }

  // Color coding: green < 70%, yellow 70-90%, red > 90%
  const getColorClasses = () => {
    if (percentage < 70) {
      return {
        progress: 'bg-green-500 dark:bg-green-600',
        text: 'text-green-700 dark:text-green-400',
        icon: 'text-green-600 dark:text-green-500',
      }
    }
    if (percentage <= 90) {
      return {
        progress: 'bg-yellow-500 dark:bg-yellow-600',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: 'text-yellow-600 dark:text-yellow-500',
      }
    }
    return {
      progress: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-600 dark:text-red-500',
    }
  }

  const colors = getColorClasses()

  // Calculate time until reset
  const getTimeUntilReset = () => {
    const now = new Date()
    const resetDate = typeof resetAt === 'string' ? new Date(resetAt) : resetAt
    const diff = resetDate.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days <= 0) return 'soon'
    if (days === 1) return 'in 1 day'
    return `in ${days} days`
  }

  const timeUntilReset = getTimeUntilReset()

  return (
    <TooltipProvider>
      <div
        data-testid="quota-warning"
        className={cn('space-y-2', global.innerWidth < 768 && 'compact')}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-label={`${bucketName} usage information`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {bucketName}
            </span>
            {isLow ? (
              <AlertTriangle
                data-testid="warning-icon"
                className={cn('h-4 w-4', colors.icon)}
              />
            ) : (
              <CheckCircle2
                data-testid="check-icon"
                className={cn('h-4 w-4', colors.icon)}
              />
            )}
          </div>
          <span className={cn('text-sm font-semibold', colors.text)}>
            {percentage}%
          </span>
        </div>

        {/* Progress Bar with Tooltip */}
        <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
          <TooltipTrigger asChild>
            <div
              className="relative"
              role="button"
              tabIndex={0}
              aria-expanded={isTooltipOpen}
              aria-describedby="quota-tooltip"
            >
              <Progress
                value={percentage}
                className="h-2"
                aria-label={`${bucketName} usage: ${used} of ${limit}`}
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              {/* Custom colored indicator */}
              <div
                data-testid="progress-fill"
                className={cn(
                  'absolute inset-0 h-2 rounded-full transition-all',
                  colors.progress,
                  isLow && 'animate-pulse'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent role="tooltip" id="quota-tooltip">
            <div className="space-y-1">
              <p className="font-semibold">
                {used} / {limit} used
              </p>
              <p className="text-muted-foreground">{remaining} remaining</p>
              <p className="text-xs text-muted-foreground">
                Resets {timeUntilReset} (
                {typeof resetAt === 'string'
                  ? new Date(resetAt).toLocaleDateString()
                  : resetAt.toLocaleDateString()}
                )
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Usage Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {used} / {limit}
          </span>
          <span>Resets {timeUntilReset}</span>
        </div>

        {/* Exhausted Warning */}
        {isExhausted && (
          <div
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            aria-live="polite"
          >
            <p className="font-semibold">Quota exhausted</p>
            <p className="mt-1 text-xs">
              Your quota will reset {timeUntilReset}
            </p>
          </div>
        )}

        {/* Low Quota Warning (for screen readers) */}
        {isLow && !isExhausted && (
          <div role="status" className="sr-only" aria-live="polite">
            Warning: Quota is running low ({remaining} remaining)
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
