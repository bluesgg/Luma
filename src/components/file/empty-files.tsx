'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileText, Upload } from 'lucide-react'
import Link from 'next/link'

export interface EmptyFilesProps extends React.HTMLAttributes<HTMLDivElement> {
  onUploadClick?: () => void
  title?: string
  description?: string
  disabled?: boolean
  disabledReason?: 'limit' | 'storage'
  variant?: 'default' | 'compact' | 'large'
  icon?: React.ReactNode
  isLoading?: boolean
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

function EmptyFiles({
  onUploadClick,
  title = 'No files yet',
  description = 'Upload PDF files to start learning with AI assistance.',
  disabled = false,
  disabledReason,
  variant = 'default',
  icon,
  isLoading = false,
  secondaryAction,
  className,
  ...props
}: EmptyFilesProps) {
  const sizeClasses = {
    compact: 'py-8 px-4',
    default: 'py-16 px-4',
    large: 'py-24 px-8',
  }

  const iconSizeClasses = {
    compact: 'w-12 h-12',
    default: 'w-16 h-16',
    large: 'w-20 h-20',
  }

  const getDisabledMessage = () => {
    if (disabledReason === 'limit') {
      return 'You have reached the maximum file limit for this course.'
    }
    if (disabledReason === 'storage') {
      return 'You have reached your storage quota. Please delete some files to continue.'
    }
    return null
  }

  const disabledMessage = getDisabledMessage()
  const isButtonDisabled = disabled || isLoading

  return (
    <div
      data-testid="empty-files"
      className={cn(
        'flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-xl',
        sizeClasses[variant],
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {/* Icon */}
      <div
        className={cn(
          'bg-slate-100 rounded-full flex items-center justify-center mb-6',
          iconSizeClasses[variant]
        )}
      >
        {icon || (
          <FileText
            className={cn(
              'text-slate-400',
              variant === 'compact' ? 'w-6 h-6' : 'w-8 h-8'
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Title */}
      {(title || isLoading) && (
        <h3 className="font-heading text-xl font-semibold text-slate-800 mb-2">
          {title}
        </h3>
      )}

      {/* Description */}
      {(description || isLoading) && (
        <p className="text-slate-600 text-center max-w-md mb-2">
          {description}
        </p>
      )}

      {/* PDF Info */}
      <p className="text-sm text-slate-500 mb-6">
        Drag and drop your PDF files here or click the button below.
      </p>

      {/* Disabled Message */}
      {disabledMessage && (
        <p className="text-sm text-amber-600 mb-4" role="alert">
          {disabledMessage}
        </p>
      )}

      {/* Upload Button */}
      <Button
        onClick={onUploadClick}
        disabled={isButtonDisabled}
        className="cursor-pointer"
        data-testid="empty-upload-button"
      >
        <Upload className="w-5 h-5 mr-2" />
        Upload PDF
      </Button>

      {/* Secondary Action */}
      {secondaryAction && (
        <div className="mt-4">
          {secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
            >
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { EmptyFiles }
