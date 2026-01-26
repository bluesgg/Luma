'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react'

const editCourseSchema = z.object({
  name: z
    .string()
    .min(1, 'Course name is required')
    .max(50, 'Course name must be 50 characters or less'),
  school: z
    .string()
    .max(100, 'School name must be 100 characters or less')
    .optional()
    .or(z.literal('')),
  term: z
    .string()
    .max(50, 'Term must be 50 characters or less')
    .optional()
    .or(z.literal('')),
})

type EditCourseFormData = z.infer<typeof editCourseSchema>

interface Course {
  id: string
  name: string
  school?: string | null
  term?: string | null
}

interface EditCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | null
  onSubmit: (data: { name?: string; school?: string; term?: string }) => Promise<void>
  isLoading: boolean
}

export function EditCourseDialog({
  open,
  onOpenChange,
  course,
  onSubmit,
  isLoading,
}: EditCourseDialogProps) {
  const form = useForm<EditCourseFormData>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      name: '',
      school: '',
      term: '',
    },
  })

  // Reset form when course changes
  useEffect(() => {
    if (course) {
      form.reset({
        name: course.name,
        school: course.school ?? '',
        term: course.term ?? '',
      })
    }
  }, [course, form])

  const handleSubmit = async (data: EditCourseFormData) => {
    await onSubmit({
      name: data.name,
      school: data.school || undefined,
      term: data.term || undefined,
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && course) {
      // Reset to original course values when closing without saving
      form.reset({
        name: course.name,
        school: course.school ?? '',
        term: course.term ?? '',
      })
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="edit-course-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Course</DialogTitle>
          <DialogDescription>Update the details of your course.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name *</FormLabel>
                  <FormControl>
                    <Input data-testid="edit-course-name-input" {...field} />
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
                  <FormLabel>School</FormLabel>
                  <FormControl>
                    <Input data-testid="edit-course-school-input" {...field} />
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
                  <FormLabel>Term</FormLabel>
                  <FormControl>
                    <Input data-testid="edit-course-term-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer"
                data-testid="edit-course-submit"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
