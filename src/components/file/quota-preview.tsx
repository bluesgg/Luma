'use client'

import * as React from 'react'
import { cn, formatFileSize } from '@/lib/utils'

export interface QuotaPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  currentFileCount: number
  maxFiles: number
  currentStorage?: number
  maxStorage?: number
  showRemaining?: boolean
  compact?: boolean
  warningThreshold?: number
  dangerThreshold?: number
  'data-testid'?: string
}

function QuotaPreview({
  currentFileCount,
  maxFiles,
  currentStorage,
  maxStorage,
  showRemaining = false,
  compact = false,
  warningThreshold = 70,
  dangerThreshold = 90,
  className,
  'data-testid': testId = 'quota-preview',
  ...props
}: QuotaPreviewProps) {
  // Handle edge cases
  const safeFileCount = Math.max(0, currentFileCount)
  const safeMaxFiles = Math.max(1, maxFiles) // Avoid division by zero
  const filePercentage = Math.min(100, (safeFileCount / safeMaxFiles) * 100)
  const remaining = Math.max(0, maxFiles - safeFileCount)

  type ColorName = 'green' | 'amber' | 'red'

  // Determine color based on usage percentage
  const getColorClass = (percentage: number): ColorName => {
    if (percentage >= dangerThreshold) {
      return 'red'
    }
    if (percentage >= warningThreshold) {
      return 'amber'
    }
    return 'green'
  }

  const colorName = getColorClass(filePercentage)

  const colorClasses: Record<ColorName, string> = {
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  }

  const progressColorClasses: Record<ColorName, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }

  // Storage calculations
  const safeCurrentStorage = Math.max(0, currentStorage || 0)
  const safeMaxStorage = Math.max(1, maxStorage || 1)
  const storagePercentage = maxStorage
    ? Math.min(100, (safeCurrentStorage / safeMaxStorage) * 100)
    : 0
  const storageColorName = maxStorage ? getColorClass(storagePercentage) : 'green'

  // Warning/Full messages
  const isNearLimit = filePercentage >= dangerThreshold && filePercentage < 100
  const isAtLimit = safeFileCount >= maxFiles

  return (
    <div
      data-testid={testId}
      aria-label={`File quota: ${safeFileCount} of ${maxFiles} files used`}
      className={cn(
        'rounded-lg p-3',
        colorClasses[colorName],
        compact && 'p-2',
        className
      )}
      {...props}
    >
      {/* File Count Display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Files</span>
        <span className="text-sm">
          {safeFileCount} / {maxFiles}
        </span>
      </div>

      {/* File Progress Bar */}
      <div className="relative mb-2">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(filePercentage)}
          aria-label={`${Math.round(filePercentage)}% of file quota used`}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              progressColorClasses[colorName]
            )}
            style={{ width: `${filePercentage}%` }}
            data-slot="indicator"
          />
        </div>
      </div>

      {/* Remaining Files */}
      {showRemaining && (
        <p className="text-xs mb-2">
          {remaining > 0
            ? `${remaining} ${remaining === 1 ? 'file' : 'files'} remaining`
            : 'No files remaining'}
        </p>
      )}

      {/* Storage Display */}
      {maxStorage !== undefined && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Storage</span>
            <span className="text-sm">
              {formatFileSize(safeCurrentStorage)} / {formatFileSize(safeMaxStorage)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(storagePercentage)}
            aria-label={`${Math.round(storagePercentage)}% of storage quota used`}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                progressColorClasses[storageColorName]
              )}
              style={{ width: `${storagePercentage}%` }}
              data-testid="storage-indicator"
            />
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {isNearLimit && (
        <p className="text-xs mt-2 font-medium" role="alert">
          Only {remaining} {remaining === 1 ? 'file' : 'files'} remaining
        </p>
      )}

      {isAtLimit && (
        <p className="text-xs mt-2 font-medium" role="alert">
          File limit reached - no more files can be added
        </p>
      )}
    </div>
  )
}

export { QuotaPreview }
