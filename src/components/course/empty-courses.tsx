'use client'

import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyCoursesProps {
  onCreateClick: () => void
}

export function EmptyCourses({ onCreateClick }: EmptyCoursesProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4"
      data-testid="empty-courses"
    >
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
        <BookOpen className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-slate-800 mb-2">
        No courses yet
      </h3>
      <p className="text-slate-600 text-center max-w-md mb-6">
        Create your first course to start organizing your PDF learning materials.
      </p>
      <Button
        onClick={onCreateClick}
        className="cursor-pointer"
        data-testid="empty-create-button"
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Course
      </Button>
    </div>
  )
}
