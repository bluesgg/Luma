/**
 * Create Course Dialog Component (CRS-006)
 * Dialog for creating a new course
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCourseSchema } from '@/lib/validation'
import type { z } from 'zod'
import { useCreateCourse, useCourses } from '@/hooks/use-courses'
import { COURSE_LIMITS } from '@/lib/constants'
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
import { Plus, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type FormData = z.infer<typeof createCourseSchema>

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false)
  const { mutate: createCourse, isPending } = useCreateCourse()
  const { data: courses, isLoading: isLoadingCourses } = useCourses()

  const form = useForm<FormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      name: '',
      school: null,
      term: null,
    },
  })

  const isAtLimit =
    courses && courses.length >= COURSE_LIMITS.MAX_COURSES_PER_USER

  function onSubmit(data: FormData) {
    createCourse(data, {
      onSuccess: () => {
        setOpen(false)
        form.reset()
      },
    })
  }

  const trigger = (
    <Button disabled={isAtLimit || isLoadingCourses}>
      <Plus className="h-4 w-4" />
      Create Course
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DialogTrigger asChild>
                {isAtLimit ? (
                  <span className="inline-block">{trigger}</span>
                ) : (
                  trigger
                )}
              </DialogTrigger>
            </div>
          </TooltipTrigger>
          {isAtLimit && (
            <TooltipContent>
              <p>
                Course limit reached ({COURSE_LIMITS.MAX_COURSES_PER_USER}/
                {COURSE_LIMITS.MAX_COURSES_PER_USER})
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Add a new course to organize your learning materials.
          </DialogDescription>
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
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
