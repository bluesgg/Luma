// =============================================================================
// Reader Store Tests (Zustand)
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'

// Define the reader store interface
interface ReaderState {
  currentPage: number
  scale: number
  sidebarOpen: boolean
  selectedText: string | null
  highlightedRegions: Array<{
    id: string
    pageNumber: number
    bbox: { x: number; y: number; width: number; height: number }
  }>
  // Actions
  setCurrentPage: (page: number) => void
  setScale: (scale: number) => void
  toggleSidebar: () => void
  setSelectedText: (text: string | null) => void
  addHighlight: (highlight: {
    id: string
    pageNumber: number
    bbox: { x: number; y: number; width: number; height: number }
  }) => void
  removeHighlight: (id: string) => void
  clearHighlights: () => void
  reset: () => void
}

// Create reader store (this is what we're testing - the implementation)
const createReaderStore = () =>
  create<ReaderState>((set) => ({
    currentPage: 1,
    scale: 1.0,
    sidebarOpen: false,
    selectedText: null,
    highlightedRegions: [],

    setCurrentPage: (page: number) => set({ currentPage: Math.max(1, page) }),

    setScale: (scale: number) =>
      set({ scale: Math.min(Math.max(0.5, scale), 3.0) }),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSelectedText: (text: string | null) => set({ selectedText: text }),

    addHighlight: (highlight) =>
      set((state) => ({
        highlightedRegions: [...state.highlightedRegions, highlight],
      })),

    removeHighlight: (id: string) =>
      set((state) => ({
        highlightedRegions: state.highlightedRegions.filter((h) => h.id !== id),
      })),

    clearHighlights: () => set({ highlightedRegions: [] }),

    reset: () =>
      set({
        currentPage: 1,
        scale: 1.0,
        sidebarOpen: false,
        selectedText: null,
        highlightedRegions: [],
      }),
  }))

describe('Reader Store', () => {
  let useReaderStore: ReturnType<typeof createReaderStore>

  beforeEach(() => {
    // Create a fresh store instance for each test
    useReaderStore = createReaderStore()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useReaderStore.getState()

      expect(state.currentPage).toBe(1)
      expect(state.scale).toBe(1.0)
      expect(state.sidebarOpen).toBe(false)
      expect(state.selectedText).toBe(null)
      expect(state.highlightedRegions).toEqual([])
    })
  })

  describe('Page Navigation', () => {
    it('should set current page', () => {
      const { setCurrentPage } = useReaderStore.getState()

      setCurrentPage(5)
      expect(useReaderStore.getState().currentPage).toBe(5)
    })

    it('should not allow page number less than 1', () => {
      const { setCurrentPage } = useReaderStore.getState()

      setCurrentPage(0)
      expect(useReaderStore.getState().currentPage).toBe(1)

      setCurrentPage(-5)
      expect(useReaderStore.getState().currentPage).toBe(1)
    })

    it('should allow navigating to any positive page number', () => {
      const { setCurrentPage } = useReaderStore.getState()

      setCurrentPage(100)
      expect(useReaderStore.getState().currentPage).toBe(100)
    })
  })

  describe('Zoom/Scale', () => {
    it('should set scale within valid range', () => {
      const { setScale } = useReaderStore.getState()

      setScale(1.5)
      expect(useReaderStore.getState().scale).toBe(1.5)
    })

    it('should clamp scale to minimum 0.5', () => {
      const { setScale } = useReaderStore.getState()

      setScale(0.3)
      expect(useReaderStore.getState().scale).toBe(0.5)
    })

    it('should clamp scale to maximum 3.0', () => {
      const { setScale } = useReaderStore.getState()

      setScale(5.0)
      expect(useReaderStore.getState().scale).toBe(3.0)
    })

    it('should handle scale increments', () => {
      const { setScale } = useReaderStore.getState()

      setScale(1.0)
      setScale(1.25)
      setScale(1.5)
      setScale(2.0)

      expect(useReaderStore.getState().scale).toBe(2.0)
    })
  })

  describe('Sidebar', () => {
    it('should toggle sidebar open/closed', () => {
      const { toggleSidebar } = useReaderStore.getState()

      expect(useReaderStore.getState().sidebarOpen).toBe(false)

      toggleSidebar()
      expect(useReaderStore.getState().sidebarOpen).toBe(true)

      toggleSidebar()
      expect(useReaderStore.getState().sidebarOpen).toBe(false)
    })

    it('should toggle sidebar multiple times', () => {
      const { toggleSidebar } = useReaderStore.getState()

      for (let i = 0; i < 5; i++) {
        toggleSidebar()
        expect(useReaderStore.getState().sidebarOpen).toBe(i % 2 === 0)
      }
    })
  })

  describe('Text Selection', () => {
    it('should set selected text', () => {
      const { setSelectedText } = useReaderStore.getState()
      const text = 'This is selected text'

      setSelectedText(text)
      expect(useReaderStore.getState().selectedText).toBe(text)
    })

    it('should clear selected text', () => {
      const { setSelectedText } = useReaderStore.getState()

      setSelectedText('Some text')
      expect(useReaderStore.getState().selectedText).toBe('Some text')

      setSelectedText(null)
      expect(useReaderStore.getState().selectedText).toBe(null)
    })

    it('should update selected text', () => {
      const { setSelectedText } = useReaderStore.getState()

      setSelectedText('First selection')
      setSelectedText('Second selection')

      expect(useReaderStore.getState().selectedText).toBe('Second selection')
    })
  })

  describe('Highlights', () => {
    it('should add a highlight', () => {
      const { addHighlight } = useReaderStore.getState()

      const highlight = {
        id: 'highlight-1',
        pageNumber: 1,
        bbox: { x: 10, y: 20, width: 100, height: 50 },
      }

      addHighlight(highlight)

      const { highlightedRegions } = useReaderStore.getState()
      expect(highlightedRegions).toHaveLength(1)
      expect(highlightedRegions[0]).toEqual(highlight)
    })

    it('should add multiple highlights', () => {
      const { addHighlight } = useReaderStore.getState()

      const highlights = [
        {
          id: 'highlight-1',
          pageNumber: 1,
          bbox: { x: 10, y: 20, width: 100, height: 50 },
        },
        {
          id: 'highlight-2',
          pageNumber: 2,
          bbox: { x: 15, y: 25, width: 120, height: 60 },
        },
        {
          id: 'highlight-3',
          pageNumber: 1,
          bbox: { x: 50, y: 100, width: 80, height: 40 },
        },
      ]

      highlights.forEach((h) => addHighlight(h))

      const { highlightedRegions } = useReaderStore.getState()
      expect(highlightedRegions).toHaveLength(3)
      expect(highlightedRegions).toEqual(highlights)
    })

    it('should remove a highlight by id', () => {
      const { addHighlight, removeHighlight } = useReaderStore.getState()

      const highlights = [
        {
          id: 'highlight-1',
          pageNumber: 1,
          bbox: { x: 10, y: 20, width: 100, height: 50 },
        },
        {
          id: 'highlight-2',
          pageNumber: 2,
          bbox: { x: 15, y: 25, width: 120, height: 60 },
        },
      ]

      highlights.forEach((h) => addHighlight(h))
      removeHighlight('highlight-1')

      const { highlightedRegions } = useReaderStore.getState()
      expect(highlightedRegions).toHaveLength(1)
      expect(highlightedRegions[0].id).toBe('highlight-2')
    })

    it('should handle removing non-existent highlight', () => {
      const { addHighlight, removeHighlight } = useReaderStore.getState()

      const highlight = {
        id: 'highlight-1',
        pageNumber: 1,
        bbox: { x: 10, y: 20, width: 100, height: 50 },
      }

      addHighlight(highlight)
      removeHighlight('non-existent-id')

      const { highlightedRegions } = useReaderStore.getState()
      expect(highlightedRegions).toHaveLength(1)
      expect(highlightedRegions[0]).toEqual(highlight)
    })

    it('should clear all highlights', () => {
      const { addHighlight, clearHighlights } = useReaderStore.getState()

      const highlights = [
        {
          id: 'highlight-1',
          pageNumber: 1,
          bbox: { x: 10, y: 20, width: 100, height: 50 },
        },
        {
          id: 'highlight-2',
          pageNumber: 2,
          bbox: { x: 15, y: 25, width: 120, height: 60 },
        },
      ]

      highlights.forEach((h) => addHighlight(h))
      expect(useReaderStore.getState().highlightedRegions).toHaveLength(2)

      clearHighlights()
      expect(useReaderStore.getState().highlightedRegions).toEqual([])
    })
  })

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      const {
        setCurrentPage,
        setScale,
        toggleSidebar,
        setSelectedText,
        addHighlight,
        reset,
      } = useReaderStore.getState()

      // Modify all state
      setCurrentPage(10)
      setScale(2.0)
      toggleSidebar()
      setSelectedText('Selected text')
      addHighlight({
        id: 'highlight-1',
        pageNumber: 1,
        bbox: { x: 10, y: 20, width: 100, height: 50 },
      })

      // Reset
      reset()

      const state = useReaderStore.getState()
      expect(state.currentPage).toBe(1)
      expect(state.scale).toBe(1.0)
      expect(state.sidebarOpen).toBe(false)
      expect(state.selectedText).toBe(null)
      expect(state.highlightedRegions).toEqual([])
    })
  })

  describe('State Persistence', () => {
    it('should maintain state across multiple actions', () => {
      const { setCurrentPage, setScale, toggleSidebar, addHighlight } =
        useReaderStore.getState()

      // Perform multiple actions
      setCurrentPage(5)
      setScale(1.5)
      toggleSidebar()
      addHighlight({
        id: 'highlight-1',
        pageNumber: 5,
        bbox: { x: 10, y: 20, width: 100, height: 50 },
      })

      // All state should be preserved
      const state = useReaderStore.getState()
      expect(state.currentPage).toBe(5)
      expect(state.scale).toBe(1.5)
      expect(state.sidebarOpen).toBe(true)
      expect(state.highlightedRegions).toHaveLength(1)
    })
  })
})
