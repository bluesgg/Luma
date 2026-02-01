/**
 * Course Card Component
 * Displays individual course information
 */

'use client'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EditCourseDialog } from './edit-course-dialog'
import { DeleteCourseDialog } from './delete-course-dialog'
import { FileText, Calendar, GraduationCap, MoreVertical } from 'lucide-react'
import type { CourseWithFiles } from '@/types'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CourseCardProps {
  course: CourseWithFiles
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter()
  const fileCount = course._count?.files || 0

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-2 text-lg">{course.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Course options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <EditCourseDialog course={course}>
                  <button className="w-full text-left">Edit</button>
                </EditCourseDialog>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <DeleteCourseDialog course={course}>
                  <button className="w-full text-left text-destructive">
                    Delete
                  </button>
                </DeleteCourseDialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {course.school && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span className="line-clamp-1">{course.school}</span>
          </div>
        )}
        {course.term && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{course.term}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => router.push(`/courses/${course.id}`)}
        >
          View Files
        </Button>
      </CardFooter>
    </Card>
  )
}
