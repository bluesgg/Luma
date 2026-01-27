'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * TUTOR-022: Page Images Component
 *
 * Image gallery with lightbox functionality.
 * Displays extracted images from PDF pages.
 */

interface PageImage {
  id: string
  pageNumber: number
  imageIndex: number
  url: string
}

interface PageImagesProps {
  images: PageImage[]
  pageNumber?: number
  className?: string
}

export function PageImages({ images, pageNumber, className }: PageImagesProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  )

  // Filter images by page number if provided
  const displayImages = pageNumber
    ? images.filter((img) => img.pageNumber === pageNumber)
    : images

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
  }

  const handleClose = () => {
    setSelectedImageIndex(null)
  }

  const handlePrevious = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }

  const handleNext = () => {
    if (
      selectedImageIndex !== null &&
      selectedImageIndex < displayImages.length - 1
    ) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }

  if (displayImages.length === 0) {
    return null
  }

  const selectedImage =
    selectedImageIndex !== null ? displayImages[selectedImageIndex] : null

  return (
    <>
      {/* Image Grid */}
      <div className={cn('space-y-2', className)}>
        <h4 className="text-sm font-medium text-muted-foreground">
          Related Images ({displayImages.length})
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {displayImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleImageClick(index)}
              className="relative aspect-video overflow-hidden rounded-lg border bg-muted transition-all hover:ring-2 hover:ring-primary"
            >
              <Image
                src={image.url}
                alt={`Page ${image.pageNumber} Image ${image.imageIndex}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white">
                Page {image.pageNumber}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={selectedImage !== null} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl p-0">
          {selectedImage && (
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Navigation buttons */}
              {selectedImageIndex !== null && selectedImageIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              {selectedImageIndex !== null &&
                selectedImageIndex < displayImages.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}

              {/* Image */}
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={selectedImage.url}
                  alt={`Page ${selectedImage.pageNumber} Image ${selectedImage.imageIndex}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
              </div>

              {/* Image info */}
              <div className="bg-muted p-4 text-sm">
                <p className="text-muted-foreground">
                  Page {selectedImage.pageNumber} - Image{' '}
                  {selectedImage.imageIndex + 1} of {displayImages.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
