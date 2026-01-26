'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2, FileText, GraduationCap, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface CourseCardProps {
  id: string
  name: string
  school?: string | null
  term?: string | null
  fileCount: number
  onEdit?: () => void
  onDelete?: () => void
}

export function CourseCard({
  id,
  name,
  school,
  term,
  fileCount,
  onEdit,
  onDelete,
}: CourseCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/files/${id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open course ${name}`}
      data-testid="course-card"
      className={cn(
        'bg-white rounded-xl p-6 border border-slate-200',
        'shadow-sm hover:shadow-md hover:border-indigo-200',
        'transition-all duration-200 cursor-pointer',
        'group relative',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {/* Header with title and menu */}
      <div className="flex justify-between items-start mb-3">
        <h3
          data-testid="course-name"
          className="font-heading text-lg font-semibold text-slate-800 line-clamp-2 pr-2"
        >
          {name}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
              aria-label="Course options"
              data-testid="course-menu-button"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={onEdit}
              className="cursor-pointer"
              data-testid="edit-course-button"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 cursor-pointer"
              data-testid="delete-course-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metadata */}
      <div className="space-y-1.5 mb-4">
        {school && (
          <div
            className="flex items-center text-sm text-slate-600"
            data-testid="course-school"
          >
            <GraduationCap className="w-4 h-4 mr-2 text-slate-400" />
            <span className="line-clamp-1">{school}</span>
          </div>
        )}
        {term && (
          <div
            className="flex items-center text-sm text-slate-600"
            data-testid="course-term"
          >
            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
            <span>{term}</span>
          </div>
        )}
      </div>

      {/* File count */}
      <div
        className="flex items-center text-sm text-slate-500 pt-3 border-t border-slate-100"
        data-testid="course-file-count"
      >
        <FileText className="w-4 h-4 mr-2" />
        <span>
          {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </span>
      </div>
    </article>
  )
}
