import { create } from 'zustand'

interface ReaderState {
  currentPage: number
  totalPages: number
  scale: number
  setCurrentPage: (page: number) => void
  setTotalPages: (total: number) => void
  setScale: (scale: number) => void
}

export const useReaderStore = create<ReaderState>((set) => ({
  currentPage: 1,
  totalPages: 0,
  scale: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  setScale: (scale) => set({ scale }),
}))
