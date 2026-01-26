'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, X, FileText, AlertCircle, RefreshCw } from 'lucide-react'
import { STORAGE } from '@/lib/constants'

export interface FileUploadZoneProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (file: File) => void
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onUploadError?: (error: { message: string; code?: string }) => void
  onCancel?: () => void
  onRetry?: () => void
  disabled?: boolean
  isUploading?: boolean
  progress?: number
  uploadingFileName?: string
  error?: string
  currentFileCount?: number
  maxFiles?: number
}

function FileUploadZone({
  onFileSelect,
  onUploadError,
  onCancel,
  onRetry,
  disabled = false,
  isUploading = false,
  progress = 0,
  uploadingFileName,
  error,
  currentFileCount,
  maxFiles = STORAGE.MAX_FILES_PER_COURSE,
  className,
  ...props
}: FileUploadZoneProps) {
  const [isDragActive, setIsDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Check if at file limit
  const isAtLimit = currentFileCount !== undefined && currentFileCount >= maxFiles
  const remainingFiles =
    currentFileCount !== undefined ? maxFiles - currentFileCount : undefined
  const isEffectivelyDisabled = disabled || isAtLimit || isUploading

  // Validate file
  const validateFile = React.useCallback(
    (file: File): { valid: boolean; error?: { message: string; code?: string } } => {
      // Check file type
      const isPdf =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        return {
          valid: false,
          error: {
            message: 'Only PDF files are allowed.',
            code: 'INVALID_TYPE',
          },
        }
      }

      // Check file size
      if (file.size > STORAGE.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: {
            message: `File size exceeds the 200 MB limit.`,
            code: 'TOO_LARGE',
          },
        }
      }

      return { valid: true }
    },
    []
  )

  // Handle file selection
  const handleFileSelect = React.useCallback(
    (file: File) => {
      const validation = validateFile(file)
      if (!validation.valid && validation.error) {
        onUploadError?.(validation.error)
        return
      }
      onFileSelect(file)
    },
    [validateFile, onFileSelect, onUploadError]
  )

  // Handle input change
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      handleFileSelect(files[0])

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileSelect]
  )

  // Handle drag events
  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isEffectivelyDisabled) {
        setIsDragActive(true)
      }
    },
    [isEffectivelyDisabled]
  )

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      if (isEffectivelyDisabled) return

      const files = e.dataTransfer.files
      if (!files || files.length === 0) return

      // Only take first file
      handleFileSelect(files[0])
    },
    [isEffectivelyDisabled, handleFileSelect]
  )

  // Handle click
  const handleClick = React.useCallback(() => {
    if (!isEffectivelyDisabled) {
      fileInputRef.current?.click()
    }
  }, [isEffectivelyDisabled])

  // Handle browse button click
  const handleBrowseClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isEffectivelyDisabled) {
        fileInputRef.current?.click()
      }
    },
    [isEffectivelyDisabled]
  )

  return (
    <div
      data-testid="file-upload-zone"
      aria-label="File upload zone"
      aria-disabled={isEffectivelyDisabled}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
        'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50',
        isDragActive && 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
        isEffectivelyDisabled && 'opacity-50 cursor-not-allowed hover:border-slate-200 hover:bg-transparent',
        error && 'border-red-300 bg-red-50/50',
        className
      )}
      {...props}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        disabled={isEffectivelyDisabled}
        className="sr-only"
        aria-label="Upload PDF file"
      />

      {/* Uploading state */}
      {isUploading && (
        <div className="space-y-4" role="status" aria-live="polite">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          {uploadingFileName && (
            <p className="font-medium text-slate-800 truncate max-w-xs mx-auto">
              {uploadingFileName}
            </p>
          )}
          <div className="space-y-2">
            <Progress
              value={progress}
              aria-label="Upload progress"
              className="w-full max-w-xs mx-auto"
            />
            <p className="text-sm text-slate-600" aria-live="polite">
              {Math.round(progress)}% uploaded
            </p>
          </div>
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
              className="cursor-pointer"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Error state */}
      {!isUploading && error && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 font-medium" role="alert">
            {error}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRetry()
              }}
              className="cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* Default state */}
      {!isUploading && !error && (
        <>
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-slate-400" />
          </div>
          <div className="space-y-2 mb-4">
            <p className="text-slate-800 font-medium">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-sm text-slate-500">PDF files, 200 MB maximum</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBrowseClick}
            disabled={isEffectivelyDisabled}
            className="cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          <div className="mt-4 text-xs text-slate-400 space-y-1">
            {remainingFiles !== undefined && remainingFiles <= 5 && remainingFiles > 0 && (
              <p className="text-amber-600 font-medium">
                Only {remainingFiles} {remainingFiles === 1 ? 'file' : 'files'} remaining
              </p>
            )}
            {remainingFiles !== undefined && remainingFiles > 5 && (
              <p>
                {remainingFiles} files remaining
              </p>
            )}
            {remainingFiles === 0 && (
              <p className="text-red-600 font-medium">
                No files remaining
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export { FileUploadZone }
