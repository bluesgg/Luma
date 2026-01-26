'use client'

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

const createCourseSchema = z.object({
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

type CreateCourseFormData = z.infer<typeof createCourseSchema>

interface CreateCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; school?: string; term?: string }) => Promise<void>
  isLoading: boolean
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateCourseDialogProps) {
  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      name: '',
      school: '',
      term: '',
    },
  })

  const handleSubmit = async (data: CreateCourseFormData) => {
    await onSubmit({
      name: data.name,
      school: data.school || undefined,
      term: data.term || undefined,
    })
    form.reset()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="create-course-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Create New Course</DialogTitle>
          <DialogDescription>
            Add a new course to organize your learning materials.
          </DialogDescription>
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
                    <Input
                      placeholder="e.g., Introduction to Psychology"
                      data-testid="course-name-input"
                      {...field}
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
                  <FormLabel>School</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Harvard University"
                      data-testid="course-school-input"
                      {...field}
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
                  <FormLabel>Term</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Fall 2025"
                      data-testid="course-term-input"
                      {...field}
                    />
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
                data-testid="create-course-submit"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Course
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
