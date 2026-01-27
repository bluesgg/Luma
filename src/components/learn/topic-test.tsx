'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LatexRenderer } from './latex-renderer'
import {
  useGetTest,
  useSubmitAnswer,
  useSkipQuestion,
  useNextTopic,
} from '@/hooks/use-learning-session'

/**
 * TUTOR-023: Topic Test Component
 *
 * Features:
 * - Multiple choice and short answer questions
 * - Answer input and submission
 * - Feedback display (correct/incorrect with explanation)
 * - Re-explanation for wrong answers
 * - Skip after 3 attempts
 * - Progress to next topic
 */

interface Question {
  index: number
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
  question: string
  options?: string[]
}

interface TopicTestProps {
  sessionId: string
  onComplete?: () => void
  className?: string
}

export function TopicTest({
  sessionId,
  onComplete,
  className,
}: TopicTestProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<{
    correct: boolean
    attemptCount: number
    explanation: string
    reExplanation?: string
    canRetry: boolean
    correctAnswer?: string
  } | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const getTestMutation = useGetTest()
  const submitAnswerMutation = useSubmitAnswer()
  const skipQuestionMutation = useSkipQuestion()
  const nextTopicMutation = useNextTopic()

  // Load test questions
  useEffect(() => {
    const loadTest = async () => {
      try {
        const result = await getTestMutation.mutateAsync({ sessionId })
        if (result.completed) {
          // All questions completed
          return
        }
        setQuestions(result.questions)
        setCurrentQuestionIndex(result.currentQuestionIndex)
      } catch (error) {
        console.error('Failed to load test:', error)
      }
    }

    loadTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const currentQuestion = questions[currentQuestionIndex]

  const handleSubmit = async () => {
    if (!answer.trim() || !currentQuestion || isAdvancing) return

    try {
      const result = await submitAnswerMutation.mutateAsync({
        sessionId,
        questionIndex: currentQuestion.index,
        answer: answer.trim(),
      })

      setFeedback(result)
      setShowExplanation(true)

      if (result.correct) {
        // Move to next question after delay
        setIsAdvancing(true)
        setTimeout(() => {
          handleNext()
          setIsAdvancing(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
      setIsAdvancing(false)
    }
  }

  const handleSkip = async () => {
    if (!currentQuestion) return

    try {
      await skipQuestionMutation.mutateAsync({
        sessionId,
        questionIndex: currentQuestion.index,
      })

      handleNext()
    } catch (error) {
      console.error('Failed to skip question:', error)
    }
  }

  const handleNext = () => {
    if (isAdvancing) return

    const nextIndex = currentQuestionIndex + 1

    if (nextIndex >= questions.length) {
      // All questions done - advance to next topic
      handleNextTopic()
    } else {
      setCurrentQuestionIndex(nextIndex)
      setAnswer('')
      setFeedback(null)
      setShowExplanation(false)
    }
  }

  const handleNextTopic = async () => {
    if (isAdvancing) return

    setIsAdvancing(true)
    try {
      const result = await nextTopicMutation.mutateAsync({ sessionId })

      if (result.completed) {
        // Session completed
        onComplete?.()
      } else {
        // Moved to next topic - reset state instead of hard reload
        setQuestions([])
        setCurrentQuestionIndex(0)
        setAnswer('')
        setFeedback(null)
        setShowExplanation(false)

        // Reload test questions for new topic
        const testResult = await getTestMutation.mutateAsync({ sessionId })
        if (!testResult.completed) {
          setQuestions(testResult.questions)
          setCurrentQuestionIndex(testResult.currentQuestionIndex)
        }
      }
    } catch (error) {
      console.error('Failed to advance to next topic:', error)
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleRetry = () => {
    setAnswer('')
    setFeedback(null)
    setShowExplanation(false)
  }

  if (getTestMutation.isPending) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Test Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You have completed all questions for this topic.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleNextTopic} className="w-full gap-2">
              Continue to Next Topic <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const canSkip =
    feedback &&
    !feedback.correct &&
    !feedback.canRetry &&
    feedback.attemptCount >= 3

  return (
    <div className={cn('mx-auto max-w-3xl p-6', className)}>
      {/* Question Progress */}
      <div className="mb-6">
        <p className="mb-2 text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            <LatexRenderer content={currentQuestion.question} />
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Answer Input */}
          {currentQuestion.type === 'MULTIPLE_CHOICE' &&
          currentQuestion.options ? (
            <RadioGroup value={answer} onValueChange={setAnswer}>
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={`option-${index}`}
                      disabled={!!feedback}
                    />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer"
                    >
                      <LatexRenderer content={option} />
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="answer">Your Answer</Label>
              <Input
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer..."
                disabled={!!feedback}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !feedback) {
                    handleSubmit()
                  }
                }}
              />
            </div>
          )}

          {/* Feedback */}
          {feedback && showExplanation && (
            <div className="mt-4 space-y-3">
              {/* Correct/Incorrect Alert */}
              <Alert variant={feedback.correct ? 'default' : 'destructive'}>
                <div className="flex items-start gap-2">
                  {feedback.correct ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      {feedback.correct ? (
                        <span className="font-medium">Correct!</span>
                      ) : (
                        <>
                          <span className="font-medium">Incorrect</span>
                          <span className="ml-2 text-sm">
                            (Attempt {feedback.attemptCount}/3)
                          </span>
                        </>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {/* Re-explanation for wrong answers */}
              {!feedback.correct && feedback.reExplanation && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="mb-1 font-medium">Let&apos;s clarify:</div>
                    <LatexRenderer content={feedback.reExplanation} />
                  </AlertDescription>
                </Alert>
              )}

              {/* Main explanation */}
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-medium">Explanation</h4>
                <LatexRenderer content={feedback.explanation} />
              </div>

              {/* Show correct answer if max attempts reached */}
              {!feedback.correct && feedback.correctAnswer && (
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <h4 className="mb-1 font-medium">Correct Answer:</h4>
                  <LatexRenderer content={feedback.correctAnswer} />
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {!feedback && (
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitAnswerMutation.isPending}
              className="flex-1"
            >
              Submit Answer
            </Button>
          )}

          {feedback && !feedback.correct && feedback.canRetry && (
            <Button onClick={handleRetry} variant="outline" className="flex-1">
              Try Again
            </Button>
          )}

          {canSkip && (
            <Button
              onClick={handleSkip}
              variant="secondary"
              className="flex-1 gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip Question
            </Button>
          )}

          {feedback && (feedback.correct || !feedback.canRetry) && (
            <Button onClick={handleNext} className="flex-1 gap-2">
              Next Question <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
