'use client'

/**
 * PDF Viewer Component
 *
 * Main PDF viewer using react-pdf with:
 * - Page rendering with zoom and rotation
 * - Keyboard navigation
 * - Loading and error states
 * - Accessibility features
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
}

interface PdfViewerProps {
  url: string
  initialPage?: number
  onPageChange?: (page: number) => void
  onLoadSuccess?: (numPages: number) => void
  onLoadError?: (error: Error) => void
  className?: string
  scale?: number
  rotation?: number
}

export function PdfViewer({
  url,
  initialPage = 1,
  onPageChange,
  onLoadSuccess,
  onLoadError,
  className,
  scale = 1.0,
  rotation = 0,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Validate and clamp scale to valid range
  const validScale = Math.max(0.5, Math.min(scale, 2.0))
  // Normalize rotation to 0-359 range
  const validRotation = ((rotation % 360) + 360) % 360

  // Use refs to avoid recreating event listener on every render
  const currentPageRef = useRef(currentPage)
  const numPagesRef = useRef(numPages)
  const onPageChangeRef = useRef(onPageChange)

  // Update refs when values change
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  useEffect(() => {
    numPagesRef.current = numPages
  }, [numPages])

  useEffect(() => {
    onPageChangeRef.current = onPageChange
  }, [onPageChange])

  // Update current page when initialPage changes
  useEffect(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  // Handle keyboard navigation with stable event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if focused on an input element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const current = currentPageRef.current
      const total = numPagesRef.current

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          if (current < total) {
            const nextPage = current + 1
            setCurrentPage(nextPage)
            onPageChangeRef.current?.(nextPage)
          }
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          if (current > 1) {
            const prevPage = current - 1
            setCurrentPage(prevPage)
            onPageChangeRef.current?.(prevPage)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // Empty dependency array - event listener is stable

  const handleDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setIsLoading(false)
      setError(null)
      // Ensure current page is within valid range
      if (currentPage > numPages) {
        setCurrentPage(numPages)
        onPageChange?.(numPages)
      } else if (currentPage < 1) {
        setCurrentPage(1)
        onPageChange?.(1)
      }
      onLoadSuccess?.(numPages)
    },
    [onLoadSuccess, currentPage, onPageChange]
  )

  const handleDocumentLoadError = useCallback(
    (error: Error) => {
      setIsLoading(false)
      setError(error)
      onLoadError?.(error)
    },
    [onLoadError]
  )

  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8',
          className
        )}
      >
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2 font-semibold">Failed to load PDF</p>
            <p className="text-sm">
              {error.message.includes('password')
                ? 'This PDF is password protected and cannot be viewed.'
                : error.message.includes('Invalid')
                  ? 'This file is not a valid PDF document.'
                  : 'There was an error loading the PDF. Please try again.'}
            </p>
          </AlertDescription>
        </Alert>
        {!error.message.includes('password') && (
          <Button onClick={handleRetry} className="mt-4">
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Document
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center p-8">
            <Skeleton className="mb-4 h-[800px] w-[600px]" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading PDF...</span>
            </div>
          </div>
        }
        className="flex justify-center"
      >
        <Page
          pageNumber={currentPage}
          scale={validScale}
          rotate={validRotation}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          loading={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          }
          className="shadow-lg"
        />
      </Document>

      {/* Screen reader announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Page {currentPage} of {numPages}
      </div>
    </div>
  )
}
