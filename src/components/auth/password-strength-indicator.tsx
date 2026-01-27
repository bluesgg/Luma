'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getPasswordStrength } from '@/lib/password'

interface PasswordStrengthIndicatorProps {
  password: string
  showLabel?: boolean
  className?: string
}

export function PasswordStrengthIndicator({
  password,
  showLabel = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return null
    return getPasswordStrength(password)
  }, [password])

  if (!strength) return null

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'strong':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStrengthValue = () => {
    switch (strength) {
      case 'weak':
        return 33
      case 'medium':
        return 66
      case 'strong':
        return 100
      default:
        return 0
    }
  }

  const getStrengthBarColor = () => {
    switch (strength) {
      case 'weak':
        return 'bg-red-600'
      case 'medium':
        return 'bg-yellow-600'
      case 'strong':
        return 'bg-green-600'
      default:
        return 'bg-gray-600'
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            getStrengthBarColor()
          )}
          style={{ width: `${getStrengthValue()}%` }}
        />
      </div>
      {showLabel && (
        <p className={cn('text-sm font-medium capitalize', getStrengthColor())}>
          Password strength: {strength}
        </p>
      )}
    </div>
  )
}
