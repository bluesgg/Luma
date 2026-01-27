import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type ExplanationLayer =
  | 'motivation'
  | 'intuition'
  | 'mathematics'
  | 'theory'
  | 'application'

interface LearningState {
  // Current learning session
  sessionId: string | null
  currentTopicIndex: number
  currentSubIndex: number

  // Explanation state
  currentLayer: ExplanationLayer
  isStreaming: boolean
  streamContent: string

  // Test state
  isTestMode: boolean
  currentQuestionIndex: number
  answers: Record<number, string>

  // UI state
  showImages: boolean
  showRelatedPages: boolean

  // Actions
  setSession: (sessionId: string) => void
  setCurrentTopic: (topicIndex: number, subIndex: number) => void
  setCurrentLayer: (layer: ExplanationLayer) => void
  setStreaming: (isStreaming: boolean) => void
  appendStreamContent: (content: string) => void
  clearStreamContent: () => void
  startTest: () => void
  endTest: () => void
  setCurrentQuestion: (index: number) => void
  setAnswer: (questionIndex: number, answer: string) => void
  toggleImages: () => void
  toggleRelatedPages: () => void
  reset: () => void
}

const initialState = {
  sessionId: null,
  currentTopicIndex: 0,
  currentSubIndex: 0,
  currentLayer: 'motivation' as ExplanationLayer,
  isStreaming: false,
  streamContent: '',
  isTestMode: false,
  currentQuestionIndex: 0,
  answers: {},
  showImages: true,
  showRelatedPages: true,
}

export const useLearningStore = create<LearningState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSession: (sessionId) =>
        set({
          sessionId,
        }),

      setCurrentTopic: (topicIndex, subIndex) =>
        set({
          currentTopicIndex: topicIndex,
          currentSubIndex: subIndex,
          isTestMode: false,
        }),

      setCurrentLayer: (layer) =>
        set({
          currentLayer: layer,
        }),

      setStreaming: (isStreaming) =>
        set({
          isStreaming,
        }),

      appendStreamContent: (content) =>
        set((state) => ({
          streamContent: state.streamContent + content,
        })),

      clearStreamContent: () =>
        set({
          streamContent: '',
        }),

      startTest: () =>
        set({
          isTestMode: true,
          currentQuestionIndex: 0,
        }),

      endTest: () =>
        set({
          isTestMode: false,
          currentQuestionIndex: 0,
          answers: {},
        }),

      setCurrentQuestion: (index) =>
        set({
          currentQuestionIndex: index,
        }),

      setAnswer: (questionIndex, answer) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [questionIndex]: answer,
          },
        })),

      toggleImages: () =>
        set((state) => ({
          showImages: !state.showImages,
        })),

      toggleRelatedPages: () =>
        set((state) => ({
          showRelatedPages: !state.showRelatedPages,
        })),

      reset: () => set(initialState),
    }),
    { name: 'LearningStore' }
  )
)
