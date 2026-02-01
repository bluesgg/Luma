/**
 * Delete Course Dialog Component (CRS-008)
 * Dialog with confirmation for deleting a course
 */

'use client'

import { useState } from 'react'
import { useDeleteCourse } from '@/hooks/use-courses'
import type { Course, CourseWithFiles } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteCourseDialogProps {
  course: Course | CourseWithFiles
  children?: React.ReactNode
}

export function DeleteCourseDialog({
  course,
  children,
}: DeleteCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const { mutate: deleteCourse, isPending } = useDeleteCourse()

  const fileCount =
    'files' in course && Array.isArray(course.files)
      ? course.files.length
      : '_count' in course && course._count?.files
        ? course._count.files
        : 0
  const isConfirmed = confirmationText.trim() === course.name

  function handleDelete() {
    if (!isConfirmed) return

    deleteCourse(
      { courseId: course.id },
      {
        onSuccess: () => {
          setOpen(false)
          setConfirmationText('')
        },
      }
    )
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      setConfirmationText('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" aria-label="Delete course">
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Course
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              <strong className="font-semibold">Warning:</strong> Deleting
              &quot;{course.name}&quot; will permanently remove:
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  {fileCount} {fileCount === 1 ? 'file' : 'files'} will be
                  deleted
                </li>
                <li>All learning progress and sessions</li>
                <li>All extracted content and images</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Type <strong>{course.name}</strong> to confirm:
            </Label>
            <Input
              id="confirm-name"
              placeholder="Type course name to confirm"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              autoFocus
              aria-label="Confirm course deletion by typing course name"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
            className="destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Course
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
