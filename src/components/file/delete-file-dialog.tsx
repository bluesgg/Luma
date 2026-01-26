'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, FileText } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

export interface DeleteFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  onConfirm: () => Promise<void>
  isLoading: boolean
  fileSize?: number
  pageCount?: number
  hasExplanations?: boolean
  hasQA?: boolean
  'data-testid'?: string
}

function DeleteFileDialog({
  open,
  onOpenChange,
  fileName,
  onConfirm,
  isLoading,
  fileSize,
  pageCount,
  hasExplanations,
  hasQA,
  'data-testid': testId,
}: DeleteFileDialogProps) {
  // Handle dialog close - prevent closing while loading
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isLoading && !newOpen) {
        return // Don't close while loading
      }
      onOpenChange(newOpen)
    },
    [isLoading, onOpenChange]
  )

  // Handle confirm click
  const handleConfirm = React.useCallback(() => {
    if (!isLoading) {
      onConfirm()
    }
  }, [isLoading, onConfirm])

  const formattedSize = fileSize !== undefined ? formatFileSize(fileSize) : null
  const showFileInfo = formattedSize || pageCount !== undefined
  const showContentWarning = hasExplanations || hasQA

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={testId}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle className="font-heading">Delete File</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete{' '}
            <strong className="text-slate-800">&quot;{fileName || 'this file'}&quot;</strong>?
            This action cannot be undone and the file will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        {/* File Info */}
        {showFileInfo && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800 truncate">
                {fileName}
              </p>
              <p className="text-xs text-slate-500">
                {[
                  pageCount !== undefined && `${pageCount} pages`,
                  formattedSize,
                ]
                  .filter(Boolean)
                  .join(' - ')}
              </p>
            </div>
          </div>
        )}

        {/* Content Warning */}
        {showContentWarning && (
          <div
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm">
              {hasExplanations && hasQA
                ? 'All AI-generated explanations and Q&A history will be deleted.'
                : hasExplanations
                  ? 'All AI-generated explanations will be deleted.'
                  : 'All Q&A history will be deleted.'}
            </span>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
            className="cursor-pointer"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteFileDialog }
