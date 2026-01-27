/**
 * AI Client for OpenRouter API
 * Handles communication with Claude 3.5 Sonnet via OpenRouter
 */

import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { AI_CONFIG } from '@/lib/constants'
import prisma from '@/lib/prisma'
import type { AIActionType } from '@prisma/client'

/**
 * AI completion options
 */
export interface AICompletionOptions {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

/**
 * AI completion response
 */
export interface AICompletionResponse {
  content: string
  inputTokens: number
  outputTokens: number
}

/**
 * Call OpenRouter API for completion
 */
export async function callAI(
  options: AICompletionOptions
): Promise<AICompletionResponse> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const {
    systemPrompt,
    userPrompt,
    maxTokens = AI_CONFIG.MAX_TOKENS,
    temperature = AI_CONFIG.TEMPERATURE,
    stream = false,
  } = options

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
          'X-Title': 'Luma Web',
        },
        body: JSON.stringify({
          model: AI_CONFIG.OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          max_tokens: maxTokens,
          temperature,
          stream,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No completion returned from API')
    }

    const content = data.choices[0].message.content
    const inputTokens = data.usage?.prompt_tokens || 0
    const outputTokens = data.usage?.completion_tokens || 0

    logger.info('AI completion successful', {
      inputTokens,
      outputTokens,
      model: AI_CONFIG.OPENROUTER_MODEL,
    })

    return {
      content,
      inputTokens,
      outputTokens,
    }
  } catch (error) {
    logger.error('AI completion failed', error)
    throw error
  }
}

/**
 * Call AI with streaming response
 */
export async function callAIStream(
  options: AICompletionOptions
): Promise<ReadableStream> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const {
    systemPrompt,
    userPrompt,
    maxTokens = AI_CONFIG.MAX_TOKENS,
    temperature = AI_CONFIG.TEMPERATURE,
  } = options

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
          'X-Title': 'Luma Web',
        },
        body: JSON.stringify({
          model: AI_CONFIG.OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    return response.body
  } catch (error) {
    logger.error('AI streaming failed', error)
    throw error
  }
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseAIJSON<T = any>(content: string): T {
  // Remove markdown code blocks if present
  let jsonStr = content.trim()

  // Remove ```json ... ``` wrapper
  if (jsonStr.startsWith('```')) {
    const firstNewline = jsonStr.indexOf('\n')
    const lastBackticks = jsonStr.lastIndexOf('```')
    if (firstNewline !== -1 && lastBackticks !== -1) {
      jsonStr = jsonStr.substring(firstNewline + 1, lastBackticks).trim()
    }
  }

  try {
    return JSON.parse(jsonStr) as T
  } catch (error) {
    logger.error('Failed to parse AI JSON response', { content, error })
    throw new Error('Invalid JSON response from AI')
  }
}

/**
 * Log AI usage to database
 */
export async function logAIUsage(
  userId: string,
  actionType: AIActionType,
  inputTokens: number,
  outputTokens: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Ensure metadata is a plain object and doesn't contain functions or circular references
    const safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata)) : {}

    await prisma.aIUsageLog.create({
      data: {
        userId,
        actionType,
        inputTokens,
        outputTokens,
        model: AI_CONFIG.OPENROUTER_MODEL,
        metadata: safeMetadata,
      },
    })

    logger.info('AI usage logged', {
      userId,
      actionType,
      inputTokens,
      outputTokens,
    })
  } catch (error) {
    logger.error('Failed to log AI usage', error)
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Check if AI is configured
 */
export function isAIConfigured(): boolean {
  return !!env.OPENROUTER_API_KEY
}
