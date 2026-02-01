/**
 * PDF Reader Store (Zustand)
 *
 * Client-side state for PDF reader
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReaderState {
  // Current page number (1-indexed)
  currentPage: number
  setCurrentPage: (page: number) => void

  // Zoom level (percentage)
  zoom: number
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void

  // View mode
  fitMode: 'width' | 'height' | 'page' | null
  setFitMode: (mode: 'width' | 'height' | 'page' | null) => void
}

export const useReaderStore = create<ReaderState>()(
  persist(
    set => ({
      currentPage: 1,
      setCurrentPage: page => set({ currentPage: page }),

      zoom: 100,
      setZoom: zoom => set({ zoom, fitMode: null }),
      zoomIn: () => set(state => ({ zoom: Math.min(state.zoom + 25, 200), fitMode: null })),
      zoomOut: () => set(state => ({ zoom: Math.max(state.zoom - 25, 50), fitMode: null })),
      resetZoom: () => set({ zoom: 100, fitMode: null }),

      fitMode: 'width',
      setFitMode: mode => set({ fitMode: mode }),
    }),
    {
      name: 'reader-storage',
      // Only persist zoom and fitMode preferences
      partialize: state => ({
        zoom: state.zoom,
        fitMode: state.fitMode,
      }),
    }
  )
)
