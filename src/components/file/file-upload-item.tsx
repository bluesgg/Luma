/**
 * FileUploadItem Component
 *
 * Displays individual file upload item with status, progress, and actions
 *
 * Status states:
 * - pending: Waiting to upload
 * - uploading: Currently uploading with progress
 * - processing: Server-side processing
 * - completed: Upload successful
 * - failed: Upload failed with error message
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FileText, X, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { UploadItem } from '@/hooks/use-multi-file-upload'

export interface FileUploadItemProps {
  item: UploadItem
  onCancel: (itemId: string) => void
  onRetry: (itemId: string) => void
  onRemove: (itemId: string) => void
}

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadItem({ item, onCancel, onRetry, onRemove }: FileUploadItemProps) {
  const { file, status, progress, error, retries } = item

  // Status-specific styling
  const borderColor = {
    pending: 'border-slate-200',
    uploading: 'border-indigo-300',
    processing: 'border-indigo-300',
    completed: 'border-green-200',
    failed: 'border-red-200',
  }[status]

  const bgColor = {
    pending: 'bg-slate-50',
    uploading: 'bg-indigo-50',
    processing: 'bg-indigo-50',
    completed: 'bg-green-50',
    failed: 'bg-red-50',
  }[status]

  // MAJOR-4: Generate dynamic aria-label for progress
  const ariaLabel = React.useMemo(() => {
    switch (status) {
      case 'pending':
        return `${file.name} - Waiting to upload`
      case 'uploading':
        return `${file.name} - Uploading ${progress}% complete`
      case 'processing':
        return `${file.name} - Processing file`
      case 'completed':
        return `${file.name} - Upload complete`
      case 'failed':
        return `${file.name} - Upload failed${error ? `: ${error}` : ''}`
      default:
        return file.name
    }
  }, [file.name, status, progress, error])

  return (
    <div
      data-testid="upload-item"
      className={cn(
        'rounded-lg border-2 p-4 transition-all duration-200',
        borderColor,
        bgColor
      )}
      role="region"
      aria-label={ariaLabel}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {status === 'completed' && (
            <CheckCircle
              data-testid="success-icon"
              aria-label="Upload complete"
              className="w-5 h-5 text-green-600"
            />
          )}
          {status === 'failed' && (
            <AlertCircle
              data-testid="error-icon"
              aria-label="Upload failed"
              className="w-5 h-5 text-red-600"
            />
          )}
          {status === 'processing' && (
            <Loader2
              data-testid="processing-spinner"
              aria-label="Processing"
              className="w-5 h-5 text-indigo-600 animate-spin"
            />
          )}
          {(status === 'pending' || status === 'uploading') && (
            <FileText className="w-5 h-5 text-slate-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* File name */}
          <p
            className="font-medium text-slate-800 truncate overflow-hidden"
            style={{ textOverflow: 'ellipsis' }}
          >
            {file.name}
          </p>

          {/* File size */}
          <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>

          {/* Status */}
          <div className="mt-2" role="status">
            {status === 'pending' && (
              <p className="text-sm text-slate-600">Waiting to upload...</p>
            )}

            {status === 'uploading' && (
              <div className="space-y-2">
                <p className="text-sm text-indigo-600">Uploading - {progress}%</p>
                <Progress
                  value={progress}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Upload progress: ${progress}%`}
                />
              </div>
            )}

            {status === 'processing' && (
              <p className="text-sm text-indigo-600">Processing file...</p>
            )}

            {status === 'completed' && (
              <p className="text-sm text-green-600">Upload complete</p>
            )}

            {status === 'failed' && (
              <div className="space-y-1">
                <p className="text-sm text-red-600 font-medium">Upload failed</p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {retries > 0 && (
                  <p className="text-xs text-slate-500">Attempt {retries} of 3</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-2">
          {(status === 'pending' || status === 'uploading') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(item.id)}
              aria-label="Cancel upload"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {status === 'failed' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRetry(item.id)}
                aria-label="Retry upload"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                aria-label="Remove from queue"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}

          {status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              aria-label="Remove from queue"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
