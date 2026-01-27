'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, BookOpen, Clock, Layers } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'

/**
 * TUTOR-017: PDF Preview Modal Component
 *
 * Modal showing PDF file overview with "Start Learning" button.
 * Initiates learning session when clicked.
 */

interface FileData {
  id: string
  name: string
  type: string
  pageCount: number | null
  structureStatus: string
  extractedAt: string | null
}

interface PDFPreviewModalProps {
  file: FileData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PDFPreviewModal({
  file,
  open,
  onOpenChange,
}: PDFPreviewModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartLearning = async () => {
    if (!file) return

    // Check if structure is extracted
    if (file.structureStatus !== 'READY') {
      toast({
        variant: 'destructive',
        title: 'PDF not ready',
        description:
          'Knowledge structure is still being extracted. Please wait.',
      })
      return
    }

    setIsStarting(true)

    try {
      // Start learning session
      const response = await apiClient.post<{ sessionId: string }>(
        `/api/files/${file.id}/learn/start`,
        {}
      )

      toast({
        title: 'Learning session started',
        description: 'Starting your interactive learning experience...',
      })

      // Navigate to learning page
      router.push(`/learn/${response.sessionId}`)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to start learning',
        description: error.message || 'Failed to start learning session',
      })
    } finally {
      setIsStarting(false)
    }
  }

  if (!file) return null

  const isReady = file.structureStatus === 'READY'
  const isProcessing = file.structureStatus === 'PROCESSING'
  const isFailed = file.structureStatus === 'FAILED'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {file.name}
          </DialogTitle>
          <DialogDescription>
            Start an interactive learning session for this PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pages:</span>
              <span className="font-medium">{file.pageCount || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline">{file.type}</Badge>
            </div>
          </div>

          <Separator />

          {/* Structure Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Knowledge Structure</span>
              <Badge
                variant={
                  isReady
                    ? 'default'
                    : isProcessing
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {file.structureStatus}
              </Badge>
            </div>

            {isProcessing && (
              <p className="text-sm text-muted-foreground">
                AI is analyzing your PDF to extract topics and create
                personalized learning content. This may take a few minutes.
              </p>
            )}

            {isFailed && (
              <p className="text-sm text-destructive">
                Failed to extract knowledge structure. Please try again or
                contact support.
              </p>
            )}

            {isReady && file.extractedAt && (
              <p className="text-sm text-muted-foreground">
                Extracted {new Date(file.extractedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {isReady && (
            <>
              <Separator />

              {/* Learning Features */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">What you&apos;ll get:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>Structured topic-by-topic explanations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Five-layer deep dives (Motivation, Intuition, Math,
                      Theory, Application)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>Interactive tests to verify understanding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>Track progress and identify weak points</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStartLearning}
            disabled={!isReady || isStarting}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            {isStarting ? 'Starting...' : 'Start Learning'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
