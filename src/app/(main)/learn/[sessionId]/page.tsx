'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { TopicOutline } from '@/components/learn/topic-outline'
import { ExplanationPanel } from '@/components/learn/explanation-panel'
import { TopicTest } from '@/components/learn/topic-test'
import { ProgressBar } from '@/components/learn/progress-bar'
import {
  useLearningSession,
  usePauseSession,
  useConfirmUnderstanding,
  getCurrentTopic,
  getCurrentSubTopic,
} from '@/hooks/use-learning-session'

/**
 * TUTOR-018: Learning Page Layout
 *
 * Three-panel layout for interactive learning:
 * 1. Left: Topic outline navigation
 * 2. Center: Explanation panel with streaming content
 * 3. Right: Topic test with questions and feedback
 *
 * Features:
 * - Responsive layout
 * - Progress tracking
 * - Session pause/resume
 * - Phase-based UI (explaining -> testing)
 */

interface PageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default function LearningPage({ params }: PageProps) {
  const { sessionId } = use(params)
  const router = useRouter()

  const { data: session, isLoading, error } = useLearningSession(sessionId)
  const pauseSessionMutation = usePauseSession()
  const confirmMutation = useConfirmUnderstanding()

  const handlePause = async () => {
    try {
      await pauseSessionMutation.mutateAsync({ sessionId })
      router.push('/') // Navigate back to home
    } catch (error) {
      console.error('Failed to pause session:', error)
    }
  }

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync({ sessionId })
    } catch (error) {
      console.error('Failed to confirm understanding:', error)
    }
  }

  const handleSessionComplete = () => {
    router.push('/')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="border-b p-4">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden p-4">
          <div className="col-span-3">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="col-span-5">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="col-span-4">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Failed to load learning session.{' '}
            {error?.message || 'Please try again.'}
          </AlertDescription>
          <Button
            onClick={() => router.push('/')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Alert>
      </div>
    )
  }

  // Session completed
  if (session.status === 'COMPLETED') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="text-2xl font-bold">Session Completed!</h1>
          <p className="text-muted-foreground">
            Congratulations! You have completed learning for {session.file.name}
            .
          </p>
          <Button onClick={() => router.push('/')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  const currentTopic = getCurrentTopic(session)
  const currentSubTopic = getCurrentSubTopic(session)

  const topicSegments = session.file.topicGroups.map((topic) => {
    const topicProg = session.topicProgress.find(
      (tp) => tp.topicGroupId === topic.id
    )
    return {
      id: topic.id,
      title: topic.title,
      type: topic.type,
      status: topicProg?.status || 'PENDING',
      isWeakPoint: topicProg?.isWeakPoint || false,
    }
  })

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5" />
                  {session.file.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentTopic?.title || 'Loading...'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handlePause}
              disabled={pauseSessionMutation.isPending}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause Session
            </Button>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            topics={topicSegments}
            currentIndex={session.currentTopicIndex}
          />
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Left Panel: Topic Outline */}
        <div className="col-span-3 overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-muted p-4">
            <h2 className="font-semibold">Topics</h2>
          </div>
          <TopicOutline
            topics={session.file.topicGroups}
            topicProgress={session.topicProgress}
            subTopicProgress={session.subTopicProgress}
            currentTopicIndex={session.currentTopicIndex}
            currentSubIndex={session.currentSubIndex}
          />
        </div>

        {/* Center Panel: Explanation */}
        <div className="col-span-5 overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-muted p-4">
            <h2 className="font-semibold">Explanation</h2>
            <p className="text-sm text-muted-foreground">
              Phase: {session.currentPhase}
            </p>
          </div>
          <ExplanationPanel
            sessionId={sessionId}
            subTopic={currentSubTopic}
            onConfirm={handleConfirm}
          />
        </div>

        {/* Right Panel: Test */}
        <div className="col-span-4 overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-muted p-4">
            <h2 className="font-semibold">Test Your Understanding</h2>
          </div>
          {session.currentPhase === 'TESTING' ? (
            <TopicTest
              sessionId={sessionId}
              onComplete={handleSessionComplete}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Complete the explanation phase first
                </p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;I Understand&quot; when you&apos;re ready for the
                  test
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
