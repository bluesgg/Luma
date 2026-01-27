import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ReaderState {
  // Current file being read
  currentFileId: string | null
  currentPage: number
  totalPages: number
  scale: number
  rotation: number

  // UI state
  isSidebarOpen: boolean
  isFullscreen: boolean

  // Actions
  setCurrentFile: (fileId: string, totalPages: number) => void
  setCurrentPage: (page: number) => void
  setScale: (scale: number) => void
  setRotation: (rotation: number) => void
  toggleSidebar: () => void
  toggleFullscreen: () => void
  reset: () => void
}

const initialState = {
  currentFileId: null,
  currentPage: 1,
  totalPages: 0,
  scale: 1.0,
  rotation: 0,
  isSidebarOpen: true,
  isFullscreen: false,
}

export const useReaderStore = create<ReaderState>()(
  devtools(
    (set) => ({
      ...initialState,

      setCurrentFile: (fileId, totalPages) =>
        set({
          currentFileId: fileId,
          totalPages,
          currentPage: 1,
        }),

      setCurrentPage: (page) =>
        set((state) => ({
          currentPage: Math.max(1, Math.min(page, state.totalPages)),
        })),

      setScale: (scale) =>
        set({
          scale: Math.max(0.5, Math.min(scale, 2.0)),
        }),

      setRotation: (rotation) =>
        set({
          rotation: rotation % 360,
        }),

      toggleSidebar: () =>
        set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        })),

      toggleFullscreen: () =>
        set((state) => ({
          isFullscreen: !state.isFullscreen,
        })),

      reset: () => set(initialState),
    }),
    { name: 'ReaderStore' }
  )
)
