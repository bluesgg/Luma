/**
 * Learning Session Store (Zustand)
 *
 * Client-side state for AI interactive learning
 */

import { create } from 'zustand'

interface LearningState {
  // Streaming state
  isStreaming: boolean
  streamContent: string
  setStreaming: (isStreaming: boolean) => void
  setStreamContent: (content: string) => void
  appendStreamContent: (chunk: string) => void
  clearStreamContent: () => void

  // Test mode (showing quiz)
  isTestMode: boolean
  setTestMode: (isTestMode: boolean) => void

  // Selected quiz answers (option indices)
  selectedAnswers: number[]
  toggleAnswer: (index: number) => void
  clearAnswers: () => void

  // Q&A input state
  qaInput: string
  setQaInput: (input: string) => void

  // Quiz result state
  quizResult: 'pending' | 'correct' | 'wrong' | null
  setQuizResult: (result: 'pending' | 'correct' | 'wrong' | null) => void

  // Wrong attempt count for current SubTopic
  wrongCount: number
  incrementWrongCount: () => void
  resetWrongCount: () => void

  // Reset all state
  reset: () => void
}

export const useLearningStore = create<LearningState>(set => ({
  isStreaming: false,
  streamContent: '',
  setStreaming: isStreaming => set({ isStreaming }),
  setStreamContent: content => set({ streamContent: content }),
  appendStreamContent: chunk =>
    set(state => ({ streamContent: state.streamContent + chunk })),
  clearStreamContent: () => set({ streamContent: '' }),

  isTestMode: false,
  setTestMode: isTestMode => set({ isTestMode }),

  selectedAnswers: [],
  toggleAnswer: index =>
    set(state => ({
      selectedAnswers: state.selectedAnswers.includes(index)
        ? state.selectedAnswers.filter(i => i !== index)
        : [...state.selectedAnswers, index].sort(),
    })),
  clearAnswers: () => set({ selectedAnswers: [] }),

  qaInput: '',
  setQaInput: input => set({ qaInput: input }),

  quizResult: null,
  setQuizResult: result => set({ quizResult: result }),

  wrongCount: 0,
  incrementWrongCount: () => set(state => ({ wrongCount: state.wrongCount + 1 })),
  resetWrongCount: () => set({ wrongCount: 0 }),

  reset: () =>
    set({
      isStreaming: false,
      streamContent: '',
      isTestMode: false,
      selectedAnswers: [],
      qaInput: '',
      quizResult: null,
      wrongCount: 0,
    }),
}))
