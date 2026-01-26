'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => {
    // Clamp value to 0-100 range, handle null/undefined/NaN/Infinity
    const clampedValue = React.useMemo(() => {
      if (value === null || value === undefined || !Number.isFinite(value)) {
        return 0
      }
      return Math.min(100, Math.max(0, value))
    }, [value])

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedValue}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-slate-200',
          className
        )}
        {...props}
      >
        <div
          data-slot="indicator"
          className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={{ transform: `translateX(-${100 - clampedValue}%)` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
