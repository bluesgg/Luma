'use client'

/**
 * Reader Header Component
 *
 * Header for the PDF reader page with:
 * - Back navigation
 * - File name display
 * - Action buttons (download, start learning)
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReaderHeaderProps {
  fileName: string
  courseId: string
  fileId: string
  structureStatus: string
  onDownload: () => void
  className?: string
}

export function ReaderHeader({
  fileName,
  courseId,
  fileId,
  structureStatus,
  onDownload,
  className,
}: ReaderHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push(`/files/${courseId}`)
  }

  const handleStartLearning = () => {
    router.push(`/learn?fileId=${fileId}`)
  }

  const canStartLearning = structureStatus === 'READY'

  return (
    <header
      className={cn(
        'flex items-center justify-between border-b bg-background px-6 py-4',
        className
      )}
    >
      {/* Left Section: Back Navigation and File Name */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Back to files"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-lg font-semibold">{fileName}</h1>
          <p className="text-sm text-muted-foreground">PDF Reader</p>
        </div>
      </div>

      {/* Right Section: Action Buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>

        <Button
          onClick={handleStartLearning}
          disabled={!canStartLearning}
          className="gap-2"
          title={
            !canStartLearning
              ? 'Structure extraction in progress. Please wait...'
              : 'Start learning session'
          }
        >
          <GraduationCap className="h-4 w-4" />
          Start Learning
        </Button>
      </div>
    </header>
  )
}
