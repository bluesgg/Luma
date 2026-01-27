'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface QuotaBadgeProps {
  used: number
  limit: number
  variant?: 'default' | 'compact'
  className?: string
}

export function QuotaBadge({
  used,
  limit,
  variant = 'default',
  className,
}: QuotaBadgeProps) {
  const percentage = Math.round((used / limit) * 100)

  // Color coding: green < 70%, yellow 70-90%, red > 90%
  const getVariant = () => {
    if (percentage < 70) return 'default' // green
    if (percentage <= 90) return 'secondary' // yellow
    return 'destructive' // red
  }

  const badgeVariant = getVariant()

  if (variant === 'compact') {
    return (
      <Badge variant={badgeVariant} className={className}>
        {percentage}%
      </Badge>
    )
  }

  return (
    <Badge variant={badgeVariant} className={cn('space-x-1', className)}>
      <span>{used}</span>
      <span>/</span>
      <span>{limit}</span>
      <span className="text-xs opacity-80">({percentage}%)</span>
    </Badge>
  )
}
