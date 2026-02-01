'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
} {
  let score = 0;

  // Length check
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;

  // Character variety checks
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;

  // Determine strength
  let strength: PasswordStrength = 'weak';
  if (score >= 70) {
    strength = 'strong';
  } else if (score >= 40) {
    strength = 'medium';
  }

  return { strength, score };
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { strength, score } = calculatePasswordStrength(password);

  const strengthConfig = {
    weak: {
      label: 'Weak',
      color: 'text-red-600',
      bgColor: 'bg-red-600',
    },
    medium: {
      label: 'Medium',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-600',
    },
    strong: {
      label: 'Strong',
      color: 'text-green-600',
      bgColor: 'bg-green-600',
    },
  };

  const config = strengthConfig[strength];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength:</span>
        <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
      </div>
      <div className="relative">
        <Progress value={score} className="h-2" />
        <div
          className={cn('absolute inset-0 h-2 rounded-full transition-all', config.bgColor)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
