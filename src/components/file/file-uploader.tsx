/**
 * FileUploader Component
 *
 * Multi-file upload component with drag-and-drop support
 *
 * Features:
 * - Drag and drop multiple files
 * - File picker with multi-select
 * - Real-time validation (PDF only, max 200MB)
 * - Upload queue with progress tracking
 * - Concurrent upload management (max 3)
 * - Retry failed uploads
 * - File limit enforcement (max 30 per course)
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { STORAGE } from '@/lib/constants'
import { useMultiFileUpload } from '@/hooks/use-multi-file-upload'
import { FileUploadItem } from './file-upload-item'

export interface FileUploaderProps {
  courseId: string
  csrfToken: string
  currentFileCount?: number
  onUploadComplete?: () => void
  className?: string
}

export function FileUploader({
  courseId,
  csrfToken,
  currentFileCount = 0,
  onUploadComplete,
  className,
}: FileUploaderProps) {
  const { queue, stats, addFiles, cancel, retry, remove, clearAll } = useMultiFileUpload(
    courseId,
    csrfToken,
    currentFileCount
  )

  const [isDragActive, setIsDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Check if at file limit
  const isAtLimit = currentFileCount >= STORAGE.MAX_FILES_PER_COURSE
  const remainingFiles = STORAGE.MAX_FILES_PER_COURSE - currentFileCount
  const isDisabled = isAtLimit

  // Show queue if any files present
  const showQueue = queue.length > 0

  // Handle file input change
  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)
      addFiles(fileArray)

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [addFiles]
  )

  // Handle drag events
  const handleDragEnter = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDisabled) {
        setIsDragActive(true)
      }
    },
    [isDisabled]
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

      if (isDisabled) return

      const files = e.dataTransfer.files
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)
      addFiles(fileArray)
    },
    [isDisabled, addFiles]
  )

  // Handle browse button click
  const handleBrowseClick = React.useCallback(() => {
    if (!isDisabled) {
      fileInputRef.current?.click()
    }
  }, [isDisabled])

  // Handle click on drop zone
  const handleDropZoneClick = React.useCallback(() => {
    if (!isDisabled) {
      fileInputRef.current?.click()
    }
  }, [isDisabled])

  // Notify parent on upload completion
  React.useEffect(() => {
    const hasCompletedFiles = queue.some((item) => item.status === 'completed')
    if (hasCompletedFiles && onUploadComplete) {
      onUploadComplete()
    }
  }, [queue, onUploadComplete])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone - shown when no files or all completed */}
      {!showQueue && (
        <div
          data-testid="file-upload-zone"
          aria-label="File upload zone"
          aria-disabled={isDisabled}
          onClick={handleDropZoneClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
            'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50',
            isDragActive && 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
            isDisabled &&
              'opacity-50 cursor-not-allowed hover:border-slate-200 hover:bg-transparent'
          )}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileInputChange}
            disabled={isDisabled}
            className="sr-only"
            aria-label="Upload PDF file"
          />

          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-slate-400" />
          </div>

          <div className="space-y-2 mb-4">
            <p className="text-slate-800 font-medium">
              Drag and drop your files here, or click to browse
            </p>
            <p className="text-sm text-slate-500">PDF files, 200 MB maximum</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBrowseClick}
            disabled={isDisabled}
            className="cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>

          {/* File count info */}
          <div className="mt-4 text-xs text-slate-400 space-y-1">
            {remainingFiles <= 5 && remainingFiles > 0 && (
              <p className="text-amber-600 font-medium">
                {remainingFiles} {remainingFiles === 1 ? 'file' : 'files'} remaining
              </p>
            )}
            {remainingFiles > 5 && <p>{remainingFiles} files remaining</p>}
            {remainingFiles === 0 && (
              <p className="text-red-600 font-medium">No files remaining</p>
            )}
          </div>
        </div>
      )}

      {/* Upload Queue */}
      {showQueue && (
        <div data-testid="upload-queue" className="space-y-4">
          {/* Queue header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Upload Queue</h3>
              <p className="text-sm text-slate-500">
                {stats.completed} of {stats.total} completed
                {stats.uploading > 0 && ` • ${stats.uploading} uploading`}
                {stats.failed > 0 && ` • ${stats.failed} failed`}
              </p>
            </div>

            {(stats.completed > 0 || stats.failed > 0) && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {/* Queue items */}
          <div className="space-y-3">
            {queue.map((item) => (
              <FileUploadItem
                key={item.id}
                item={item}
                onCancel={cancel}
                onRetry={retry}
                onRemove={remove}
              />
            ))}
          </div>

          {/* Add more files button */}
          {!isDisabled && stats.uploading === 0 && stats.processing === 0 && (
            <Button
              variant="outline"
              onClick={handleBrowseClick}
              className="w-full cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add More Files
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
