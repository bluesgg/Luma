'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-react'

interface DeleteCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseName: string
  onConfirm: () => Promise<void>
  isLoading: boolean
  fileCount?: number
}

export function DeleteCourseDialog({
  open,
  onOpenChange,
  courseName,
  onConfirm,
  isLoading,
  fileCount,
}: DeleteCourseDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('')

  // Clear confirmation input when dialog closes
  useEffect(() => {
    if (!open) {
      setConfirmationInput('')
    }
  }, [open])

  // Check if confirmation matches exactly (case-sensitive)
  const isConfirmationValid = confirmationInput === courseName

  // Delete button should be disabled if:
  // 1. Loading is in progress
  // 2. Confirmation doesn't match
  const isDeleteDisabled = isLoading || !isConfirmationValid

  // Determine if we should show file count warning
  const showFileCountWarning = fileCount !== undefined && fileCount > 0

  // Get proper pluralization for file count
  const getFileText = (count: number) => {
    return count === 1 ? '1 file' : `${count} files`
  }

  // Handle Enter key submission
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && isConfirmationValid && !isLoading) {
        onConfirm()
      }
    },
    [isConfirmationValid, isLoading, onConfirm]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="delete-course-dialog">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle className="font-heading">Delete Course</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete <strong>&quot;{courseName}&quot;</strong>? This
            action cannot be undone and all associated files will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        {/* File count warning */}
        {showFileCountWarning && (
          <div
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800"
            data-testid="file-count-warning"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm">
              This course contains {getFileText(fileCount ?? 0)} that will be permanently deleted.
            </span>
          </div>
        )}

        {/* Confirmation input section */}
        <div className="space-y-2">
          <Label htmlFor="confirmation-input" className="text-sm text-muted-foreground">
            To confirm deletion, type the course name:{' '}
            <span className="font-semibold text-foreground">{courseName}</span>
          </Label>
          <Input
            id="confirmation-input"
            data-testid="confirmation-input"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type "${courseName}" to confirm`}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="cursor-pointer"
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleteDisabled}
            className="cursor-pointer"
            data-testid="confirm-delete-button"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
