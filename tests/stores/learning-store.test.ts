// =============================================================================
// Learning Store Tests (Zustand)
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import type { ExplanationLayer } from '@/types/database'

// Define the learning store interface
interface LearningState {
  // Current state
  currentLayer: ExplanationLayer | null
  isStreaming: boolean
  streamContent: string
  testMode: boolean
  showImages: boolean

  // Current question state
  currentQuestionId: string | null
  currentAnswer: string | null
  questionAttempts: number
  canSkipQuestion: boolean

  // Actions
  setCurrentLayer: (layer: ExplanationLayer | null) => void
  setIsStreaming: (streaming: boolean) => void
  appendStreamContent: (content: string) => void
  clearStreamContent: () => void
  setTestMode: (testMode: boolean) => void
  toggleImages: () => void
  setCurrentQuestion: (questionId: string) => void
  setCurrentAnswer: (answer: string) => void
  incrementAttempts: () => void
  resetQuestion: () => void
  reset: () => void
}

// Create learning store (this is what we're testing - the implementation)
const createLearningStore = () =>
  create<LearningState>((set) => ({
    // Initial state
    currentLayer: null,
    isStreaming: false,
    streamContent: '',
    testMode: false,
    showImages: true,
    currentQuestionId: null,
    currentAnswer: null,
    questionAttempts: 0,
    canSkipQuestion: false,

    // Actions
    setCurrentLayer: (layer) => set({ currentLayer: layer }),

    setIsStreaming: (streaming) => set({ isStreaming: streaming }),

    appendStreamContent: (content) =>
      set((state) => ({ streamContent: state.streamContent + content })),

    clearStreamContent: () => set({ streamContent: '' }),

    setTestMode: (testMode) => set({ testMode }),

    toggleImages: () => set((state) => ({ showImages: !state.showImages })),

    setCurrentQuestion: (questionId) =>
      set({ currentQuestionId: questionId, questionAttempts: 0 }),

    setCurrentAnswer: (answer) => set({ currentAnswer: answer }),

    incrementAttempts: () =>
      set((state) => {
        const newAttempts = state.questionAttempts + 1
        return {
          questionAttempts: newAttempts,
          canSkipQuestion: newAttempts >= 3,
        }
      }),

    resetQuestion: () =>
      set({
        currentQuestionId: null,
        currentAnswer: null,
        questionAttempts: 0,
        canSkipQuestion: false,
      }),

    reset: () =>
      set({
        currentLayer: null,
        isStreaming: false,
        streamContent: '',
        testMode: false,
        showImages: true,
        currentQuestionId: null,
        currentAnswer: null,
        questionAttempts: 0,
        canSkipQuestion: false,
      }),
  }))

describe('Learning Store', () => {
  let useLearningStore: ReturnType<typeof createLearningStore>

  beforeEach(() => {
    // Create a fresh store instance for each test
    useLearningStore = createLearningStore()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useLearningStore.getState()

      expect(state.currentLayer).toBe(null)
      expect(state.isStreaming).toBe(false)
      expect(state.streamContent).toBe('')
      expect(state.testMode).toBe(false)
      expect(state.showImages).toBe(true)
      expect(state.currentQuestionId).toBe(null)
      expect(state.currentAnswer).toBe(null)
      expect(state.questionAttempts).toBe(0)
      expect(state.canSkipQuestion).toBe(false)
    })
  })

  describe('Explanation Layers', () => {
    it('should set current layer', () => {
      const { setCurrentLayer } = useLearningStore.getState()

      setCurrentLayer('motivation')
      expect(useLearningStore.getState().currentLayer).toBe('motivation')
    })

    it('should cycle through all layers', () => {
      const { setCurrentLayer } = useLearningStore.getState()

      const layers: ExplanationLayer[] = [
        'motivation',
        'intuition',
        'mathematics',
        'theory',
        'application',
      ]

      layers.forEach((layer) => {
        setCurrentLayer(layer)
        expect(useLearningStore.getState().currentLayer).toBe(layer)
      })
    })

    it('should allow setting layer to null', () => {
      const { setCurrentLayer } = useLearningStore.getState()

      setCurrentLayer('motivation')
      expect(useLearningStore.getState().currentLayer).toBe('motivation')

      setCurrentLayer(null)
      expect(useLearningStore.getState().currentLayer).toBe(null)
    })
  })

  describe('Streaming', () => {
    it('should set streaming state', () => {
      const { setIsStreaming } = useLearningStore.getState()

      setIsStreaming(true)
      expect(useLearningStore.getState().isStreaming).toBe(true)

      setIsStreaming(false)
      expect(useLearningStore.getState().isStreaming).toBe(false)
    })

    it('should append stream content', () => {
      const { appendStreamContent } = useLearningStore.getState()

      appendStreamContent('Hello ')
      appendStreamContent('world')
      appendStreamContent('!')

      expect(useLearningStore.getState().streamContent).toBe('Hello world!')
    })

    it('should clear stream content', () => {
      const { appendStreamContent, clearStreamContent } =
        useLearningStore.getState()

      appendStreamContent('Some content')
      expect(useLearningStore.getState().streamContent).toBe('Some content')

      clearStreamContent()
      expect(useLearningStore.getState().streamContent).toBe('')
    })

    it('should handle streaming workflow', () => {
      const { setIsStreaming, appendStreamContent, clearStreamContent } =
        useLearningStore.getState()

      // Start streaming
      setIsStreaming(true)
      expect(useLearningStore.getState().isStreaming).toBe(true)

      // Stream content
      appendStreamContent('Chunk 1 ')
      appendStreamContent('Chunk 2 ')
      appendStreamContent('Chunk 3')
      expect(useLearningStore.getState().streamContent).toBe(
        'Chunk 1 Chunk 2 Chunk 3'
      )

      // End streaming
      setIsStreaming(false)
      expect(useLearningStore.getState().isStreaming).toBe(false)

      // Clear for next stream
      clearStreamContent()
      expect(useLearningStore.getState().streamContent).toBe('')
    })
  })

  describe('Test Mode', () => {
    it('should toggle test mode on', () => {
      const { setTestMode } = useLearningStore.getState()

      setTestMode(true)
      expect(useLearningStore.getState().testMode).toBe(true)
    })

    it('should toggle test mode off', () => {
      const { setTestMode } = useLearningStore.getState()

      setTestMode(true)
      setTestMode(false)
      expect(useLearningStore.getState().testMode).toBe(false)
    })

    it('should switch between explanation and test mode', () => {
      const { setTestMode, setCurrentLayer } = useLearningStore.getState()

      // Start in explanation mode
      setCurrentLayer('motivation')
      expect(useLearningStore.getState().testMode).toBe(false)

      // Switch to test mode
      setTestMode(true)
      expect(useLearningStore.getState().testMode).toBe(true)

      // Switch back to explanation mode
      setTestMode(false)
      expect(useLearningStore.getState().testMode).toBe(false)
    })
  })

  describe('Images', () => {
    it('should toggle images visibility', () => {
      const { toggleImages } = useLearningStore.getState()

      expect(useLearningStore.getState().showImages).toBe(true)

      toggleImages()
      expect(useLearningStore.getState().showImages).toBe(false)

      toggleImages()
      expect(useLearningStore.getState().showImages).toBe(true)
    })

    it('should toggle images multiple times', () => {
      const { toggleImages } = useLearningStore.getState()

      for (let i = 0; i < 10; i++) {
        toggleImages()
        expect(useLearningStore.getState().showImages).toBe(i % 2 === 0)
      }
    })
  })

  describe('Question State', () => {
    it('should set current question', () => {
      const { setCurrentQuestion } = useLearningStore.getState()

      setCurrentQuestion('question-1')
      expect(useLearningStore.getState().currentQuestionId).toBe('question-1')
      expect(useLearningStore.getState().questionAttempts).toBe(0)
    })

    it('should set current answer', () => {
      const { setCurrentAnswer } = useLearningStore.getState()

      setCurrentAnswer('Answer A')
      expect(useLearningStore.getState().currentAnswer).toBe('Answer A')
    })

    it('should increment attempts', () => {
      const { incrementAttempts } = useLearningStore.getState()

      incrementAttempts()
      expect(useLearningStore.getState().questionAttempts).toBe(1)
      expect(useLearningStore.getState().canSkipQuestion).toBe(false)

      incrementAttempts()
      expect(useLearningStore.getState().questionAttempts).toBe(2)
      expect(useLearningStore.getState().canSkipQuestion).toBe(false)

      incrementAttempts()
      expect(useLearningStore.getState().questionAttempts).toBe(3)
      expect(useLearningStore.getState().canSkipQuestion).toBe(true)
    })

    it('should enable skip after 3 attempts', () => {
      const { incrementAttempts } = useLearningStore.getState()

      for (let i = 0; i < 3; i++) {
        incrementAttempts()
      }

      expect(useLearningStore.getState().canSkipQuestion).toBe(true)
    })

    it('should reset question state', () => {
      const {
        setCurrentQuestion,
        setCurrentAnswer,
        incrementAttempts,
        resetQuestion,
      } = useLearningStore.getState()

      // Set up question state
      setCurrentQuestion('question-1')
      setCurrentAnswer('Answer A')
      incrementAttempts()
      incrementAttempts()

      // Reset
      resetQuestion()

      const state = useLearningStore.getState()
      expect(state.currentQuestionId).toBe(null)
      expect(state.currentAnswer).toBe(null)
      expect(state.questionAttempts).toBe(0)
      expect(state.canSkipQuestion).toBe(false)
    })

    it('should handle complete question workflow', () => {
      const {
        setCurrentQuestion,
        setCurrentAnswer,
        incrementAttempts,
        resetQuestion,
      } = useLearningStore.getState()

      // Question 1
      setCurrentQuestion('question-1')
      setCurrentAnswer('Wrong answer')
      incrementAttempts()
      incrementAttempts()
      resetQuestion()

      // Question 2
      setCurrentQuestion('question-2')
      setCurrentAnswer('Correct answer')
      expect(useLearningStore.getState().questionAttempts).toBe(0)
      resetQuestion()

      // Verify clean state
      const state = useLearningStore.getState()
      expect(state.currentQuestionId).toBe(null)
      expect(state.currentAnswer).toBe(null)
      expect(state.questionAttempts).toBe(0)
    })
  })

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      const {
        setCurrentLayer,
        setIsStreaming,
        appendStreamContent,
        setTestMode,
        toggleImages,
        setCurrentQuestion,
        setCurrentAnswer,
        incrementAttempts,
        reset,
      } = useLearningStore.getState()

      // Modify all state
      setCurrentLayer('mathematics')
      setIsStreaming(true)
      appendStreamContent('Some content')
      setTestMode(true)
      toggleImages()
      setCurrentQuestion('question-1')
      setCurrentAnswer('Answer')
      incrementAttempts()
      incrementAttempts()
      incrementAttempts()

      // Reset
      reset()

      const state = useLearningStore.getState()
      expect(state.currentLayer).toBe(null)
      expect(state.isStreaming).toBe(false)
      expect(state.streamContent).toBe('')
      expect(state.testMode).toBe(false)
      expect(state.showImages).toBe(true)
      expect(state.currentQuestionId).toBe(null)
      expect(state.currentAnswer).toBe(null)
      expect(state.questionAttempts).toBe(0)
      expect(state.canSkipQuestion).toBe(false)
    })
  })

  describe('Complex Workflows', () => {
    it('should handle complete learning session workflow', () => {
      const {
        setCurrentLayer,
        setIsStreaming,
        appendStreamContent,
        clearStreamContent,
        setTestMode,
      } = useLearningStore.getState()

      // Explanation phase
      setCurrentLayer('motivation')
      setIsStreaming(true)
      appendStreamContent('Motivation content...')
      setIsStreaming(false)

      // Move to next layer
      setCurrentLayer('intuition')
      clearStreamContent()
      setIsStreaming(true)
      appendStreamContent('Intuition content...')
      setIsStreaming(false)

      // Switch to test mode
      setTestMode(true)
      expect(useLearningStore.getState().testMode).toBe(true)
    })

    it('should maintain state consistency across actions', () => {
      const { setCurrentLayer, setTestMode, setCurrentQuestion, toggleImages } =
        useLearningStore.getState()

      // Perform multiple actions
      setCurrentLayer('application')
      setTestMode(false)
      toggleImages()
      setCurrentQuestion('question-1')

      // Verify all state
      const state = useLearningStore.getState()
      expect(state.currentLayer).toBe('application')
      expect(state.testMode).toBe(false)
      expect(state.showImages).toBe(false)
      expect(state.currentQuestionId).toBe('question-1')
    })
  })
})
