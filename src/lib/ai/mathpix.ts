/**
 * Mathpix API Integration
 * Handles formula recognition from images
 */

import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import prisma from '@/lib/prisma'

/**
 * Mathpix API response
 */
export interface MathpixResponse {
  latex: string
  confidence: number
  text: string
}

/**
 * Call Mathpix API to recognize formula in image
 */
export async function recognizeFormula(
  imageUrl: string
): Promise<MathpixResponse> {
  if (!env.MATHPIX_APP_ID || !env.MATHPIX_APP_KEY) {
    throw new Error('Mathpix API credentials are not configured')
  }

  try {
    const response = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        app_id: env.MATHPIX_APP_ID,
        app_key: env.MATHPIX_APP_KEY,
      },
      body: JSON.stringify({
        src: imageUrl,
        formats: ['latex_simplified', 'text'],
        data_options: {
          include_asciimath: false,
          include_latex: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mathpix API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    logger.info('Formula recognized by Mathpix', {
      confidence: data.confidence,
    })

    return {
      latex: data.latex_simplified || data.latex || '',
      confidence: data.confidence || 0,
      text: data.text || '',
    }
  } catch (error) {
    logger.error('Mathpix API call failed', error)
    throw error
  }
}

/**
 * Log Mathpix usage to database
 */
export async function logMathpixUsage(
  userId: string,
  fileId: string,
  requestCount: number = 1
): Promise<void> {
  try {
    await prisma.mathpixUsage.create({
      data: {
        userId,
        fileId,
        requestCount,
      },
    })

    logger.info('Mathpix usage logged', { userId, fileId, requestCount })
  } catch (error) {
    logger.error('Failed to log Mathpix usage', error)
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Get Mathpix usage stats for a user
 */
export async function getMathpixUsageStats(userId: string) {
  const usages = await prisma.mathpixUsage.findMany({
    where: { userId },
  })

  const totalRequests = usages.reduce(
    (sum, usage) => sum + usage.requestCount,
    0
  )

  // Mathpix cost: $0.004 per request
  const totalCost = totalRequests * 0.004

  return {
    totalRequests,
    totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
  }
}

/**
 * Check if Mathpix is configured
 */
export function isMathpixConfigured(): boolean {
  return !!env.MATHPIX_APP_ID && !!env.MATHPIX_APP_KEY
}

/**
 * Detect if text contains LaTeX formulas
 */
export function containsLatex(text: string): boolean {
  // Check for common LaTeX patterns
  const latexPatterns = [
    /\$[^$]+\$/, // Inline: $...$
    /\$\$[^$]+\$\$/, // Display: $$...$$
    /\\frac{/, // Fractions
    /\\int/, // Integrals
    /\\sum/, // Summations
    /\\prod/, // Products
    /\\sqrt{/, // Square roots
    /\\[a-zA-Z]+{/, // General LaTeX commands
  ]

  return latexPatterns.some((pattern) => pattern.test(text))
}

/**
 * Extract LaTeX formulas from text
 */
export function extractLatexFormulas(text: string): string[] {
  const formulas: string[] = []

  // Extract inline formulas: $...$
  const inlineMatches = text.match(/\$([^$]+)\$/g)
  if (inlineMatches) {
    formulas.push(...inlineMatches.map((m) => m.slice(1, -1)))
  }

  // Extract display formulas: $$...$$
  const displayMatches = text.match(/\$\$([^$]+)\$\$/g)
  if (displayMatches) {
    formulas.push(...displayMatches.map((m) => m.slice(2, -2)))
  }

  return formulas
}
