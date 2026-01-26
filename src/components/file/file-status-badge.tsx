'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { FileStatus } from '@prisma/client'

export interface FileStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: FileStatus
  progress?: number
  variant?: 'default' | 'compact'
  /** Error message to display when status is 'failed' */
  errorMessage?: string
}

const statusConfig = {
  uploading: {
    label: 'Uploading',
    icon: Upload,
    colorClass: 'bg-slate-100 text-slate-700',
    iconClass: 'text-slate-500',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    colorClass: 'bg-amber-100 text-amber-700',
    iconClass: 'text-amber-500 animate-spin',
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle,
    colorClass: 'bg-green-100 text-green-700',
    iconClass: 'text-green-500',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-700',
    iconClass: 'text-red-500',
  },
} as const

function FileStatusBadge({
  status,
  progress,
  variant = 'default',
  errorMessage,
  className,
  ...props
}: FileStatusBadgeProps) {
  // Handle invalid status gracefully
  const config = statusConfig[status] || statusConfig.failed
  const Icon = config.icon

  // Round progress to nearest integer
  const displayProgress = progress !== undefined ? Math.round(progress) : undefined

  const isUploading = status === 'uploading'
  const isProcessing = status === 'processing'
  const isFailed = status === 'failed'

  // Determine tooltip text based on status and error message
  const tooltipText = isFailed && errorMessage ? errorMessage : config.label

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        config.colorClass,
        className
      )}
      aria-busy={isProcessing ? 'true' : undefined}
      title={tooltipText}
      {...props}
    >
      <Icon className={cn('h-3.5 w-3.5', config.iconClass)} />
      {variant === 'default' && <span>{config.label}</span>}

      {isUploading && displayProgress !== undefined && (
        <>
          <span className="ml-0.5">{displayProgress}%</span>
          <Progress
            value={displayProgress}
            className="h-1 w-12 ml-1"
            aria-label="Upload progress"
          />
        </>
      )}
    </span>
  )
}

export { FileStatusBadge }
