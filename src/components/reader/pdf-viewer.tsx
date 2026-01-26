'use client'

import { useEffect, useCallback } from 'react'

interface PDFViewerProps {
  fileId: string
  currentPage: number
  totalPages?: number
  onPageChange: (page: number) => void
}

export function PDFViewer({ fileId, currentPage, totalPages, onPageChange }: PDFViewerProps) {
  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange])

  const goToNextPage = useCallback(() => {
    if (!totalPages || currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === 'ArrowLeft') {
        goToPrevPage()
      } else if (e.key === 'ArrowRight') {
        goToNextPage()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevPage, goToNextPage])

  return (
    <div className="flex-1 flex flex-col" data-file-id={fileId}>
      <div className="flex-1 bg-muted flex items-center justify-center">
        {/* TODO: Implement PDF rendering with react-pdf using fileId to fetch PDF */}
        <p className="text-muted-foreground">
          PDF Viewer - Page {currentPage}{totalPages ? ` of ${totalPages}` : ''}
        </p>
      </div>
      <div className="p-2 border-t flex justify-center gap-2">
        <button
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
          aria-label="Go to previous page (Left arrow)"
        >
          Previous
        </button>
        <span className="px-3 py-1" aria-live="polite" aria-atomic="true">
          {currentPage}{totalPages ? ` / ${totalPages}` : ''}
        </span>
        <button
          onClick={goToNextPage}
          disabled={totalPages ? currentPage >= totalPages : false}
          className="px-3 py-1 border rounded disabled:opacity-50"
          aria-label="Go to next page (Right arrow)"
        >
          Next
        </button>
      </div>
    </div>
  )
}
