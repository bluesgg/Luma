'use client'

import { cn } from '@/lib/utils'

/**
 * TUTOR-024: Learning Progress Bar Component
 *
 * Segmented progress bar showing topic completion status.
 * Each segment represents a topic (CORE topics highlighted).
 */

interface TopicSegment {
  id: string
  title: string
  type: 'CORE' | 'SUPPORTING'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  isWeakPoint?: boolean
}

interface ProgressBarProps {
  topics: TopicSegment[]
  currentIndex: number
  className?: string
}

export function ProgressBar({
  topics,
  currentIndex,
  className,
}: ProgressBarProps) {
  if (topics.length === 0) {
    return null
  }

  const completed = topics.filter((t) => t.status === 'COMPLETED').length
  const percentage = Math.round((completed / topics.length) * 100)

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {completed} of {topics.length} topics completed
        </span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex gap-1">
        {topics.map((topic, index) => {
          const isCurrent = index === currentIndex
          const isCompleted = topic.status === 'COMPLETED'
          const isInProgress = topic.status === 'IN_PROGRESS' || isCurrent
          const isWeakPoint = topic.isWeakPoint && isCompleted

          return (
            <div
              key={topic.id}
              className={cn(
                'h-2 flex-1 rounded-full transition-all',
                // Base styles
                'border',
                // Status colors
                {
                  'border-primary bg-primary': isCompleted && !isWeakPoint,
                  'border-yellow-500 bg-yellow-500': isWeakPoint,
                  'animate-pulse border-primary bg-primary/50': isInProgress,
                  'border-muted-foreground/20 bg-muted':
                    !isCompleted && !isInProgress,
                },
                // Core topic styling
                {
                  'h-3': topic.type === 'CORE',
                }
              )}
              title={`${topic.title} - ${topic.status}${isWeakPoint ? ' (Weak Point)' : ''}`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-primary" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-full bg-yellow-500" />
          <span>Weak Point</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-4 rounded-full border border-muted-foreground/20 bg-muted" />
          <span>Core Topic</span>
        </div>
      </div>
    </div>
  )
}
