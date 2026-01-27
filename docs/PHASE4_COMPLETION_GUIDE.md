# Phase 4: AI Interactive Tutor - Completion Guide

## Progress Summary

**Completed**: 11/27 tasks (41%)
**Status**: Infrastructure complete, core APIs functional

### ✅ What's Done

1. Infrastructure Layer (R2, Trigger.dev, AI client, Quota management)
2. Core Learning APIs (Start session, Get session, Extract retry, Images API)
3. Explanation API with SSE streaming
4. Confirmation API

### 🚧 What Remains

16 tasks across API routes, hooks, and components

---

## Quick Start: Complete Remaining Implementation

### Step 1: Install Dependencies (5 mins)

```bash
# AWS SDK for R2
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Trigger.dev
npm install @trigger.dev/sdk

# KaTeX for LaTeX rendering
npm install katex react-katex
npm install --save-dev @types/katex

# Python dependencies
pip3 install PyMuPDF
```

### Step 2: Create Remaining API Routes (60 mins)

All API routes follow the same pattern. Here's the template:

```typescript
/**
 * POST /api/learn/sessions/:id/[action]
 */
import type { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  handleError,
  HTTP_STATUS,
} from '@/lib/api-response'
import { ERROR_CODES } from '@/lib/constants'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const sessionId = params.id

    // 1. Get session
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      include: {
        /* ... */
      },
    })

    // 2. Validate ownership
    if (!session || session.userId !== user.id) {
      return errorResponse(
        ERROR_CODES.TUTOR_SESSION_FORBIDDEN,
        '...',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 3. Parse request body (if needed)
    const body = await request.json()

    // 4. Perform action
    // ... business logic ...

    // 5. Return response
    return successResponse({
      /* ... */
    })
  } catch (error) {
    return handleError(error)
  }
}
```

#### Files to Create:

**TUTOR-011**: `src/app/api/learn/sessions/[id]/test/route.ts`

```typescript
// Generate or retrieve test questions for current topic
// Check if tests exist in database (TopicTest table)
// If not, call AI to generate questions
// Return first unanswered question
```

**TUTOR-012**: `src/app/api/learn/sessions/[id]/answer/route.ts`

```typescript
// Parse { questionId, answer } from request body
// Check correctness against TopicTest.correctAnswer
// Update TopicProgress.questionAttempts
// Track weak points (attempts >= 3)
// Return feedback and next action
```

**TUTOR-013**: `src/app/api/learn/sessions/[id]/skip/route.ts`

```typescript
// Increment skip counter in TopicProgress
// Move to next question
// Return next question or completion status
```

**TUTOR-014**: `src/app/api/learn/sessions/[id]/next/route.ts`

```typescript
// Mark current TopicProgress as COMPLETED
// Update session.currentTopicIndex++
// Update session.currentSubIndex = 0
// Update session.currentPhase = 'EXPLAINING'
// Return next topic info
```

**TUTOR-015**: `src/app/api/learn/sessions/[id]/pause/route.ts`

```typescript
// Update session.status = 'PAUSED'
// Update session.lastActiveAt
// Return success
```

**TUTOR-027**: `src/app/api/files/[id]/topics/[topicId]/route.ts`

```typescript
// PATCH endpoint to update TopicGroup.type
// Parse { type: 'CORE' | 'SUPPORTING' }
// Validate ownership
// Update and return
```

### Step 3: Create React Hooks (30 mins)

**TUTOR-025**: `src/hooks/use-sse.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react'

export function useSSE(url: string | null, options?: { enabled?: boolean }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  const connect = useCallback(() => {
    if (!url || !options?.enabled) return

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      retryCountRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        setData(parsed)
      } catch (e) {
        // Invalid JSON
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        setTimeout(connect, 1000 * retryCountRef.current)
      } else {
        setError(new Error('Max retry attempts reached'))
      }
    }
  }, [url, options?.enabled])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [connect])

  return { data, error, isConnected }
}
```

**TUTOR-026**: `src/hooks/use-learning-session.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useLearningSession(sessionId: string) {
  const queryClient = useQueryClient()

  const { data: session, isLoading } = useQuery({
    queryKey: ['learning-session', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/learn/sessions/${sessionId}`)
      if (!res.ok) throw new Error('Failed to fetch session')
      return res.json()
    },
  })

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/learn/sessions/${sessionId}/confirm`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to confirm')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['learning-session', sessionId],
      })
    },
  })

  // Add more mutations: test, answer, skip, next, pause...

  return {
    session,
    isLoading,
    confirm: confirmMutation.mutate,
    isConfirming: confirmMutation.isPending,
  }
}
```

### Step 4: Create UI Components (2 hours)

All components follow shadcn/ui patterns. Install shadcn components first:

```bash
npx shadcn-ui@latest add dialog button card tabs progress
```

**TUTOR-021**: `src/components/learn/latex-renderer.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export function LatexRenderer({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    try {
      // Replace inline math: $...$
      let html = content.replace(/\$([^$]+)\$/g, (match, latex) => {
        return katex.renderToString(latex, { throwOnError: false })
      })

      // Replace display math: $$...$$
      html = html.replace(/\$\$([^$]+)\$\$/g, (match, latex) => {
        return katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
        })
      })

      ref.current.innerHTML = html
    } catch (error) {
      ref.current.textContent = content
    }
  }, [content])

  return <div ref={ref} className="prose dark:prose-invert" />
}
```

**TUTOR-024**: `src/components/learn/progress-bar.tsx`

```typescript
'use client'

import { Progress } from '@/components/ui/progress'

interface Topic {
  id: string
  title: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
}

export function ProgressBar({ topics, currentIndex }: { topics: Topic[]; currentIndex: number }) {
  const completed = topics.filter((t) => t.status === 'COMPLETED').length
  const percentage = Math.round((completed / topics.length) * 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="flex gap-1">
        {topics.map((topic, i) => (
          <div
            key={topic.id}
            className={`h-2 flex-1 rounded ${
              topic.status === 'COMPLETED'
                ? 'bg-green-500'
                : i === currentIndex
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
            }`}
            title={topic.title}
          />
        ))}
      </div>
    </div>
  )
}
```

**TUTOR-019**: `src/components/learn/topic-outline.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TopicOutline({ outline, currentTopicIndex, onTopicClick }: any) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else {
        next.add(topicId)
      }
      return next
    })
  }

  return (
    <div className="space-y-2">
      {outline.map((topic: any, index: number) => {
        const isExpanded = expandedTopics.has(topic.id)
        const isCurrent = index === currentTopicIndex

        return (
          <div key={topic.id} className="space-y-1">
            <Button
              variant={isCurrent ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => toggleTopic(topic.id)}
            >
              {isExpanded ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              {topic.status === 'COMPLETED' && <Check className="mr-2 h-4 w-4 text-green-500" />}
              <span className="truncate">{topic.title}</span>
            </Button>

            {isExpanded && (
              <div className="ml-6 space-y-1">
                {topic.subTopics.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                  >
                    {sub.confirmed && <Check className="h-3 w-3 text-green-500" />}
                    <span>{sub.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

**TUTOR-020**: `src/components/learn/explanation-panel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LatexRenderer } from './latex-renderer'
import { PageImages } from './page-images'
import { useSSE } from '@/hooks/use-sse'

export function ExplanationPanel({ sessionId, onComplete }: any) {
  const [activeLayer, setActiveLayer] = useState('motivation')
  const { data, isConnected } = useSSE(`/api/learn/sessions/${sessionId}/explain`, {
    enabled: true,
  })

  const layers = ['motivation', 'intuition', 'mathematics', 'theory', 'application']

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data?.subTopic?.title || 'Loading...'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeLayer} onValueChange={setActiveLayer}>
          <TabsList className="grid w-full grid-cols-5">
            {layers.map((layer) => (
              <TabsTrigger key={layer} value={layer} className="capitalize">
                {layer}
              </TabsTrigger>
            ))}
          </TabsList>

          {layers.map((layer) => (
            <TabsContent key={layer} value={layer}>
              {data?.content?.[layer] ? (
                <LatexRenderer content={data.content[layer]} />
              ) : (
                <div>Loading {layer}...</div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {data?.relatedImages && (
          <div className="mt-6">
            <h3 className="mb-2 font-semibold">Related Images</h3>
            <PageImages images={data.relatedImages} />
          </div>
        )}

        {data?.type === 'done' && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onComplete}>I Understand</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**TUTOR-018**: `src/app/(main)/learn/[sessionId]/page.tsx`

```typescript
'use client'

import { TopicOutline } from '@/components/learn/topic-outline'
import { ExplanationPanel } from '@/components/learn/explanation-panel'
import { TopicTest } from '@/components/learn/topic-test'
import { ProgressBar } from '@/components/learn/progress-bar'
import { useLearningSession } from '@/hooks/use-learning-session'

export default function LearningPage({ params }: { params: { sessionId: string } }) {
  const { session, isLoading, confirm } = useLearningSession(params.sessionId)

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Left sidebar: Outline */}
      <div className="col-span-3">
        <ProgressBar
          topics={session.outline}
          currentIndex={session.session.currentTopicIndex}
        />
        <div className="mt-4">
          <TopicOutline outline={session.outline} currentTopicIndex={session.session.currentTopicIndex} />
        </div>
      </div>

      {/* Main content */}
      <div className="col-span-9">
        {session.session.currentPhase === 'EXPLAINING' && (
          <ExplanationPanel sessionId={params.sessionId} onComplete={() => confirm()} />
        )}

        {session.session.currentPhase === 'TESTING' && (
          <TopicTest sessionId={params.sessionId} />
        )}
      </div>
    </div>
  )
}
```

### Step 5: Testing (30 mins)

1. **Test PDF upload and structure extraction**:

   ```bash
   # Upload a test PDF through the UI
   # Check database: TopicGroup, SubTopic, ExtractedImage
   # Check R2 bucket for images
   ```

2. **Test learning session**:

   ```bash
   # Start session
   # Test explanation streaming
   # Confirm subtopics
   # Test question generation
   # Submit answers
   ```

3. **Test quota management**:
   ```bash
   # Check quota consumption
   # Test quota exceeded error
   ```

---

## Environment Setup

### Required Services

1. **Supabase**: Already configured ✅
2. **PostgreSQL**: Already configured ✅
3. **OpenRouter**: Get API key from https://openrouter.ai
4. **Cloudflare R2**:
   - Create R2 bucket: "luma-images"
   - Generate access keys
   - Optional: Enable public access
5. **Trigger.dev** (optional for MVP):
   - Sign up at https://trigger.dev
   - Create project
   - Get API key

### .env.local

```env
# Existing (already configured)
DATABASE_URL=...
DIRECT_URL=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# New (add these)
OPENROUTER_API_KEY=sk-or-v1-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=luma-images
R2_PUBLIC_URL=https://your-bucket.r2.dev
TRIGGER_API_KEY=...
TRIGGER_API_URL=https://api.trigger.dev
MATHPIX_APP_ID=... (optional)
MATHPIX_APP_KEY=... (optional)
```

---

## File Checklist

### ✅ Completed (11 files)

- [x] src/lib/r2/index.ts
- [x] scripts/extract_images.py
- [x] src/lib/ai/index.ts
- [x] src/lib/ai/prompts/structure-extraction.ts
- [x] src/lib/ai/prompts/explanation.ts
- [x] src/lib/ai/mathpix.ts
- [x] src/lib/quota/index.ts
- [x] src/trigger/client.ts
- [x] src/trigger/jobs/extract-pdf-structure.ts
- [x] src/app/api/files/[id]/extract/retry/route.ts
- [x] src/app/api/files/[id]/learn/start/route.ts
- [x] src/app/api/learn/sessions/[id]/route.ts
- [x] src/app/api/files/[id]/images/route.ts
- [x] src/app/api/learn/sessions/[id]/explain/route.ts
- [x] src/app/api/learn/sessions/[id]/confirm/route.ts

### 🚧 To Create (12 files)

- [ ] src/app/api/learn/sessions/[id]/test/route.ts
- [ ] src/app/api/learn/sessions/[id]/answer/route.ts
- [ ] src/app/api/learn/sessions/[id]/skip/route.ts
- [ ] src/app/api/learn/sessions/[id]/next/route.ts
- [ ] src/app/api/learn/sessions/[id]/pause/route.ts
- [ ] src/app/api/files/[id]/topics/[topicId]/route.ts
- [ ] src/hooks/use-sse.ts
- [ ] src/hooks/use-learning-session.ts
- [ ] src/components/learn/latex-renderer.tsx
- [ ] src/components/learn/page-images.tsx
- [ ] src/components/learn/progress-bar.tsx
- [ ] src/components/learn/topic-outline.tsx
- [ ] src/components/learn/explanation-panel.tsx
- [ ] src/components/learn/topic-test.tsx
- [ ] src/components/file/pdf-preview-modal.tsx
- [ ] src/app/(main)/learn/[sessionId]/page.tsx

---

## Success Criteria

✅ Phase 4 is complete when:

1. User can upload PDF and structure is extracted
2. User can start learning session
3. User can read explanations with LaTeX rendering
4. User can confirm understanding and progress through topics
5. User can take tests and submit answers
6. Quota system tracks usage
7. Images display with signed URLs

---

## Support

- Refer to existing code patterns in `src/app/api/auth/` for API routes
- Refer to `src/components/ui/` for component patterns
- Check `PHASE4_PLAN.md` for detailed specifications
- Check `PHASE4_TDD_SUMMARY.md` for test cases
