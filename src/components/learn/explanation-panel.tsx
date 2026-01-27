'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LatexRenderer } from './latex-renderer'
import { PageImages } from './page-images'
import { useSSE } from '@/hooks/use-sse'
import type { SubTopic } from '@/hooks/use-learning-session'

/**
 * TUTOR-020: SubTopic Explanation Panel Component
 *
 * Five-layer collapsible explanation sections:
 * 1. Motivation
 * 2. Intuition
 * 3. Mathematics
 * 4. Theory
 * 5. Application
 *
 * Features:
 * - SSE streaming for real-time explanation generation
 * - Collapsible layers
 * - LaTeX rendering
 * - Image gallery integration
 */

interface ExplanationLayer {
  id: 'motivation' | 'intuition' | 'mathematics' | 'theory' | 'application'
  title: string
  icon: string
  content: string
}

interface ExplanationPanelProps {
  sessionId: string
  subTopic: SubTopic | null
  images?: Array<{
    id: string
    pageNumber: number
    imageIndex: number
    url: string
  }>
  onConfirm?: () => void
  className?: string
}

export function ExplanationPanel({
  sessionId,
  subTopic,
  images = [],
  onConfirm,
  className,
}: ExplanationPanelProps) {
  const [layers, setLayers] = useState<ExplanationLayer[]>([
    { id: 'motivation', title: 'Motivation', icon: '🎯', content: '' },
    { id: 'intuition', title: 'Intuition', icon: '💡', content: '' },
    { id: 'mathematics', title: 'Mathematics', icon: '📐', content: '' },
    { id: 'theory', title: 'Theory', icon: '📚', content: '' },
    { id: 'application', title: 'Application', icon: '🔧', content: '' },
  ])
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(
    new Set(['motivation', 'intuition'])
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  // SSE connection for streaming explanations
  const sse = useSSE(`/api/learn/sessions/${sessionId}/explain`, {
    onMessage: (data) => {
      if (data.type === 'layer') {
        // Update specific layer content
        setLayers((prev) =>
          prev.map((layer) =>
            layer.id === data.layerId
              ? { ...layer, content: layer.content + data.chunk }
              : layer
          )
        )
      } else if (data.type === 'complete') {
        setIsLoading(false)
      } else if (data.type === 'error') {
        setIsLoading(false)
      }
    },
    onError: (error) => {
      console.error('SSE error:', error)
      setIsLoading(false)
    },
    onOpen: () => {
      setIsLoading(true)
    },
  })

  // Reset when subtopic changes
  useEffect(() => {
    if (subTopic) {
      // Disconnect previous SSE connection if any
      sse.disconnect()

      // Reset layers
      setLayers([
        { id: 'motivation', title: 'Motivation', icon: '🎯', content: '' },
        { id: 'intuition', title: 'Intuition', icon: '💡', content: '' },
        { id: 'mathematics', title: 'Mathematics', icon: '📐', content: '' },
        { id: 'theory', title: 'Theory', icon: '📚', content: '' },
        { id: 'application', title: 'Application', icon: '🔧', content: '' },
      ])
      setIsConfirmed(false)
      setExpandedLayers(new Set(['motivation', 'intuition']))
    }

    // Cleanup on unmount
    return () => {
      sse.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTopic?.id])

  const toggleLayer = (layerId: string) => {
    const newExpanded = new Set(expandedLayers)
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId)
    } else {
      newExpanded.add(layerId)
    }
    setExpandedLayers(newExpanded)
  }

  const handleConfirm = () => {
    setIsConfirmed(true)
    onConfirm?.()
  }

  if (!subTopic) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <p className="text-muted-foreground">
          Select a subtopic to view explanation
        </p>
      </div>
    )
  }

  // Filter images for this subtopic's related pages
  const relatedImages = images.filter((img) =>
    subTopic.metadata.relatedPages.includes(img.pageNumber)
  )

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="mb-1 text-lg font-semibold">{subTopic.title}</h2>
        <p className="text-sm text-muted-foreground">
          {subTopic.metadata.summary}
        </p>
        {subTopic.metadata.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {subTopic.metadata.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-muted px-2 py-1 text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Explanation Layers */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {layers.map((layer) => {
            const isExpanded = expandedLayers.has(layer.id)
            const hasContent = layer.content.length > 0

            return (
              <div
                key={layer.id}
                className="overflow-hidden rounded-lg border bg-card"
              >
                {/* Layer Header */}
                <button
                  onClick={() => toggleLayer(layer.id)}
                  className="flex w-full items-center gap-2 p-3 transition-colors hover:bg-accent"
                >
                  <span className="text-lg">{layer.icon}</span>
                  <span className="flex-1 text-left font-medium">
                    {layer.title}
                  </span>
                  {isLoading && !hasContent && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Layer Content */}
                {isExpanded && (
                  <div className="border-t p-4 pt-0">
                    {hasContent ? (
                      <LatexRenderer content={layer.content} />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        {isLoading
                          ? 'Generating explanation...'
                          : 'Click "Request Explanation" to generate content'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Related Images */}
          {relatedImages.length > 0 && (
            <PageImages images={relatedImages} className="mt-4" />
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="space-y-2 border-t p-4">
        {!isLoading && layers.every((l) => l.content === '') && (
          <Button
            onClick={() => sse.connect()}
            className="w-full"
            disabled={isLoading}
          >
            Request Explanation
          </Button>
        )}

        {layers.some((l) => l.content !== '') && !isConfirmed && (
          <Button onClick={handleConfirm} className="w-full" variant="default">
            I Understand - Continue to Test
          </Button>
        )}

        {isConfirmed && (
          <div className="text-center text-sm text-muted-foreground">
            Confirmed. Proceed to the test section.
          </div>
        )}
      </div>
    </div>
  )
}
