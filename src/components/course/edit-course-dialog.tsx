/**
 * Edit Course Dialog Component (CRS-007)
 * Dialog for editing an existing course
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateCourseSchema } from '@/lib/validation'
import type { z } from 'zod'
import { useUpdateCourse } from '@/hooks/use-courses'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Loader2 } from 'lucide-react'

type FormData = z.infer<typeof updateCourseSchema>

interface EditCourseDialogProps {
  course: Course | CourseWithFiles
  children?: React.ReactNode
}

export function EditCourseDialog({ course, children }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const { mutate: updateCourse, isPending } = useUpdateCourse()

  const form = useForm<FormData>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      name: course.name,
      school: course.school ?? null,
      term: course.term ?? null,
    },
  })

  // Reset form when course changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: course.name,
        school: course.school ?? null,
        term: course.term ?? null,
      })
    }
  }, [open, course, form])

  function onSubmit(data: FormData) {
    updateCourse(
      {
        courseId: course.id,
        data,
      },
      {
        onSuccess: () => {
          setOpen(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit course</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>Update your course information.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Computer Science 101"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., MIT"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Fall 2024"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
