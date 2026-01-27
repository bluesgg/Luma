'use client'

/**
 * PDF Toolbar Component
 *
 * Provides navigation and viewing controls for PDF viewer:
 * - Page navigation (prev/next, direct page input)
 * - Zoom controls (in/out, fit width/page, percentage selector)
 * - Rotation control
 * - Fullscreen toggle
 */

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Minimize,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PdfToolbarProps {
  currentPage: number
  totalPages: number
  scale: number
  isFullscreen: boolean
  onPageChange: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onScaleChange: (scale: number) => void
  onRotate: () => void
  onToggleFullscreen: () => void
  className?: string
}

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

export function PdfToolbar({
  currentPage,
  totalPages,
  scale,
  isFullscreen,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onScaleChange,
  onRotate,
  onToggleFullscreen,
  className,
}: PdfToolbarProps) {
  const [pageInput, setPageInput] = useState(currentPage.toString())

  // Sync page input with current page
  useEffect(() => {
    setPageInput(currentPage.toString())
  }, [currentPage])

  const handlePageInputChange = (value: string) => {
    setPageInput(value)
  }

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page)
    } else {
      // Reset to current page if invalid
      setPageInput(currentPage.toString())
    }
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit()
      e.currentTarget.blur()
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const handleZoomChange = (value: string) => {
    const zoomValue = parseFloat(value)
    if (!isNaN(zoomValue)) {
      onScaleChange(zoomValue)
    }
  }

  const canZoomIn = scale < 2.0
  const canZoomOut = scale > 0.5

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-t bg-background px-4 py-3',
        className
      )}
    >
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => handlePageInputChange(e.target.value)}
            onBlur={handlePageInputSubmit}
            onKeyDown={handlePageInputKeyDown}
            className="w-16 text-center"
            aria-label="Current page"
          />
          <span className="text-sm text-muted-foreground">of {totalPages}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Select value={scale.toString()} onValueChange={handleZoomChange}>
          <SelectTrigger className="w-28" aria-label="Zoom level">
            <SelectValue>{Math.round(scale * 100)}%</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ZOOM_LEVELS.map((level) => (
              <SelectItem key={level} value={level.toString()}>
                {Math.round(level * 100)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Additional Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRotate}
          aria-label="Rotate clockwise"
        >
          <RotateCw className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
