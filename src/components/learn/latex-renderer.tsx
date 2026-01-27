'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * TUTOR-021: LaTeX/Formula Renderer Component
 *
 * Renders LaTeX mathematical notation using KaTeX.
 * Supports both inline ($...$) and display ($$...$$) formulas.
 */

interface LatexRendererProps {
  content: string
  className?: string
}

export function LatexRenderer({ content, className }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Dynamically import KaTeX to avoid SSR issues
    const renderLatex = async () => {
      try {
        const katex = await import('katex')
        // CSS is imported globally in layout
        // await import('katex/dist/katex.min.css')

        if (!containerRef.current) return

        // Process the content to render LaTeX
        const processedContent = renderLatexInContent(content, katex.default)
        containerRef.current.innerHTML = processedContent
      } catch (error) {
        console.error('Failed to render LaTeX:', error)
        // Fallback: just display the raw content
        if (containerRef.current) {
          containerRef.current.textContent = content
        }
      }
    }

    renderLatex()
  }, [content])

  return (
    <div
      ref={containerRef}
      className={cn('prose prose-sm max-w-none', className)}
    />
  )
}

/**
 * Process content to render LaTeX formulas
 */
function renderLatexInContent(content: string, katex: any): string {
  // Extract LaTeX formulas first to protect them from HTML escaping
  const displayMathParts: string[] = []
  const inlineMathParts: string[] = []

  // Replace display math with placeholders
  let processedContent = content.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_, formula) => {
      displayMathParts.push(formula.trim())
      return `__DISPLAY_MATH_${displayMathParts.length - 1}__`
    }
  )

  // Replace inline math with placeholders
  processedContent = processedContent.replace(
    /\$([^$\n]+?)\$/g,
    (_, formula) => {
      inlineMathParts.push(formula.trim())
      return `__INLINE_MATH_${inlineMathParts.length - 1}__`
    }
  )

  // Now escape HTML in the remaining content
  processedContent = escapeHtml(processedContent)

  // Convert markdown formatting (after escaping but before restoring math)
  processedContent = processedContent
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic
    .replace(/\n\n/g, '</p><p>') // Paragraphs
    .replace(/\n/g, '<br>') // Line breaks

  // Restore display math with KaTeX rendering
  processedContent = processedContent.replace(
    /__DISPLAY_MATH_(\d+)__/g,
    (_, index) => {
      try {
        return katex.renderToString(displayMathParts[parseInt(index)], {
          displayMode: true,
          throwOnError: false,
        })
      } catch {
        return `$$${displayMathParts[parseInt(index)]}$$`
      }
    }
  )

  // Restore inline math with KaTeX rendering
  processedContent = processedContent.replace(
    /__INLINE_MATH_(\d+)__/g,
    (_, index) => {
      try {
        return katex.renderToString(inlineMathParts[parseInt(index)], {
          displayMode: false,
          throwOnError: false,
        })
      } catch {
        return `$${inlineMathParts[parseInt(index)]}$`
      }
    }
  )

  // Wrap in paragraph tags
  processedContent = `<p>${processedContent}</p>`

  return processedContent
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(
    /[&<>"']/g,
    (char) => map[char as keyof typeof map] || char
  )
}

/**
 * Simple markdown renderer for explanation text
 */
interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return <LatexRenderer content={content} className={className} />
}
