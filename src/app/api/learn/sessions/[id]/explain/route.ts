/**
 * POST /api/learn/sessions/:id/explain
 * Stream explanation for current subtopic (Server-Sent Events)
 */

import type { NextRequest } from 'next/server'
import { errorResponse, HTTP_STATUS } from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { callAIStream, logAIUsage } from '@/lib/ai'
import {
  EXPLANATION_SYSTEM_PROMPT,
  generateExplanationPrompt,
} from '@/lib/ai/prompts/explanation'
import { checkQuota, consumeQuota } from '@/lib/quota'
import { generateSignedUrlBatch } from '@/lib/r2'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const params = await context.params
    const sessionId = params.id

    // Get session with current subtopic
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      include: {
        file: {
          include: {
            topicGroups: {
              include: {
                subTopics: true,
              },
              orderBy: {
                index: 'asc',
              },
            },
          },
        },
      },
    })

    if (!session) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_NOT_FOUND,
        'Learning session not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Check ownership
    if (session.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_FORBIDDEN,
        'You do not have permission to access this session',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // Check quota
    const quota = await checkQuota(user.id, 'LEARNING_INTERACTIONS', 1)
    if (!quota.allowed) {
      return errorResponse(
        ERROR_CODES.TUTOR_QUOTA_EXCEEDED,
        'You have exceeded your monthly learning interactions quota',
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    // Get current topic and subtopic
    const currentTopic = session.file.topicGroups[session.currentTopicIndex]
    if (!currentTopic) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'Current topic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    const currentSubTopic = currentTopic.subTopics[session.currentSubIndex]
    if (!currentSubTopic) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        'Current subtopic not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // For demo purposes, using simplified PDF context
    // In production, you'd extract text from related pages
    const pdfContext = `Content from pages ${(currentSubTopic.metadata as any).relatedPages?.join(', ') || 'N/A'}`

    // Generate explanation prompt
    const prompt = generateExplanationPrompt(
      currentSubTopic.title,
      currentTopic.title,
      currentSubTopic.metadata as any,
      pdfContext,
      (currentSubTopic.metadata as any).relatedPages || []
    )

    // Consume quota before streaming
    await consumeQuota(user.id, 'LEARNING_INTERACTIONS', 1, {
      sessionId: session.id,
      subTopicId: currentSubTopic.id,
    })

    // Get related images
    const relatedPages = (currentSubTopic.metadata as any).relatedPages || []
    const images = await prisma.extractedImage.findMany({
      where: {
        fileId: session.file.id,
        pageNumber: {
          in: relatedPages,
        },
      },
      take: 5, // Limit to 5 images
    })

    const imagePaths = images.map((img) => img.storagePath)
    const signedUrls = await generateSignedUrlBatch(imagePaths)

    const relatedImages = images.map((img) => ({
      url: signedUrls[img.storagePath] || '',
      pageNumber: img.pageNumber,
      imageIndex: img.imageIndex,
      label: `Page ${img.pageNumber}, Image ${img.imageIndex + 1}`,
    }))

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Send initial metadata
        const metadata = {
          type: 'metadata',
          subTopic: {
            id: currentSubTopic.id,
            title: currentSubTopic.title,
            topicTitle: currentTopic.title,
            pageRange: `${currentTopic.pageStart || '?'}-${currentTopic.pageEnd || '?'}`,
          },
          relatedImages,
          hasNextSub:
            session.currentSubIndex < currentTopic.subTopics.length - 1,
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
        )

        try {
          // Get AI stream
          const aiStream = await callAIStream({
            systemPrompt: EXPLANATION_SYSTEM_PROMPT,
            userPrompt: prompt,
          })

          const reader = aiStream.getReader()
          const decoder = new TextDecoder()

          let accumulatedText = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content

                  if (content) {
                    accumulatedText += content
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: 'content', content })}\n\n`
                      )
                    )
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }

          // Log AI usage (estimate tokens)
          const inputTokens = Math.ceil(prompt.length / 4)
          const outputTokens = Math.ceil(accumulatedText.length / 4)
          await logAIUsage(user.id, 'EXPLAIN', inputTokens, outputTokens, {
            sessionId: session.id,
            subTopicId: currentSubTopic.id,
          })

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          )
        } catch (error: any) {
          logger.error('Streaming error', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    logger.info('Explanation streaming started', {
      sessionId: session.id,
      subTopicId: currentSubTopic.id,
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    logger.error('Explain route error', error)

    // Return error as JSON response
    return errorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to generate explanation',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}
