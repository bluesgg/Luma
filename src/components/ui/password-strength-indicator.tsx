'use client'

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AUTH } from '@/lib/constants'

export interface PasswordStrengthCriteria {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordStrength {
  level: StrengthLevel
  score: number
  criteria: PasswordStrengthCriteria
}

export function calculatePasswordStrength(password: string): PasswordStrength | null {
  if (!password) {
    return null
  }

  const criteria: PasswordStrengthCriteria = {
    minLength: password.length >= AUTH.PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(password),
  }

  const score = Object.values(criteria).filter(Boolean).length

  let level: StrengthLevel
  if (score <= 2) {
    level = 'weak'
  } else if (score === 3) {
    level = 'fair'
  } else if (score === 4) {
    level = 'good'
  } else {
    level = 'strong'
  }

  return { level, score, criteria }
}

interface PasswordStrengthIndicatorProps {
  password: string
  showCriteria?: boolean
  className?: string
}

export function PasswordStrengthIndicator({
  password,
  showCriteria = false,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  if (!strength) {
    return null
  }

  const levelConfig = {
    weak: {
      color: 'text-red-500',
      barColor: 'bg-red-500',
      label: 'Weak',
      bars: 1,
    },
    fair: {
      color: 'text-orange-500',
      barColor: 'bg-orange-500',
      label: 'Fair',
      bars: 2,
    },
    good: {
      color: 'text-yellow-500',
      barColor: 'bg-yellow-500',
      label: 'Good',
      bars: 3,
    },
    strong: {
      color: 'text-green-500',
      barColor: 'bg-green-500',
      label: 'Strong',
      bars: 4,
    },
  }

  const config = levelConfig[strength.level]

  const criteriaLabels = [
    { key: 'minLength', label: `${AUTH.PASSWORD_MIN_LENGTH}+ characters` },
    { key: 'hasUppercase', label: 'Uppercase letter' },
    { key: 'hasLowercase', label: 'Lowercase letter' },
    { key: 'hasNumber', label: 'Number' },
    { key: 'hasSpecialChar', label: 'Special character' },
  ] as const

  return (
    <div
      data-testid="password-strength-indicator"
      className={cn('space-y-2', config.color, className)}
      aria-label={`Password strength: ${config.label}`}
    >
      {/* Progress bars */}
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={strength.score}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label={`Password strength: ${strength.score} out of 5`}
      >
        {[1, 2, 3, 4].map((barIndex) => (
          <div
            key={barIndex}
            role="presentation"
            data-testid={barIndex <= config.bars ? 'strength-bar-filled' : 'strength-bar-empty'}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-200',
              barIndex <= config.bars ? config.barColor : 'bg-slate-200'
            )}
          />
        ))}
      </div>

      {/* Strength label */}
      <p role="status" aria-live="polite" className="text-xs font-medium">
        Password strength: {config.label}
      </p>

      {/* Criteria checklist */}
      {showCriteria && (
        <ul className="space-y-1" role="list">
          {criteriaLabels.map(({ key, label }) => {
            const met = strength.criteria[key]
            return (
              <li
                key={key}
                data-testid={met ? 'criteria-met' : 'criteria-unmet'}
                className={cn(
                  'flex items-center gap-2 text-xs',
                  met ? 'text-green-600' : 'text-slate-500'
                )}
                role="listitem"
              >
                {met ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <X className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
