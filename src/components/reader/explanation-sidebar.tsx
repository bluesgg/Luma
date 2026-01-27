'use client'

/**
 * Explanation Sidebar Component
 *
 * Collapsible right sidebar for displaying AI explanations of the current page.
 * Can be used for future features like:
 * - Page summaries
 * - Key concepts
 * - Related topics
 */

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ExplanationSidebarProps {
  isOpen: boolean
  onClose: () => void
  currentPage: number
  isMobile?: boolean
  className?: string
}

export function ExplanationSidebar({
  isOpen,
  onClose,
  currentPage,
  isMobile = false,
  className,
}: ExplanationSidebarProps) {
  // Mobile version uses Sheet (slide-over)
  if (isMobile) {
    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Page {currentPage} Information</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-6 h-[calc(100vh-8rem)]">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Page information and AI-generated explanations will appear here.
              </p>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop version is a fixed sidebar
  if (!isOpen) return null

  return (
    <aside
      className={cn('flex w-80 flex-col border-l bg-background', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          Page {currentPage} Information
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">About This Page</h3>
            <p className="text-sm text-muted-foreground">
              Page information and AI-generated explanations will appear here.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">
              Start a learning session to get explanations and test your
              knowledge.
            </p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
