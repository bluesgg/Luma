/**
 * Navigation Component Tests
 * Unit tests for the main navigation component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navigation } from '@/components/layout/navigation'

// Mock next/navigation
const mockUsePathname = vi.fn(() => '/courses')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

describe('Navigation Component', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/courses')
  })

  describe('Rendering', () => {
    it('renders navigation element', () => {
      render(<Navigation />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('has accessible aria-label', () => {
      render(<Navigation />)

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
    })

    it('renders all navigation links', () => {
      render(<Navigation />)

      expect(screen.getByRole('link', { name: /courses/i })).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /settings/i })
      ).toBeInTheDocument()
    })
  })

  describe('Link URLs', () => {
    it('courses link points to /courses', () => {
      render(<Navigation />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      expect(coursesLink).toHaveAttribute('href', '/courses')
    })

    it('settings link points to /settings', () => {
      render(<Navigation />)

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })
  })

  describe('Active Link Highlighting', () => {
    it('marks courses link as active when on courses page', () => {
      mockUsePathname.mockReturnValue('/courses')

      render(<Navigation />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      expect(coursesLink).toHaveAttribute('aria-current', 'page')
    })

    it('marks settings link as active when on settings page', () => {
      mockUsePathname.mockReturnValue('/settings')

      render(<Navigation />)

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).toHaveAttribute('aria-current', 'page')
    })

    it('does not mark links as active when on different page', () => {
      mockUsePathname.mockReturnValue('/other')

      render(<Navigation />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      const settingsLink = screen.getByRole('link', { name: /settings/i })

      expect(coursesLink).not.toHaveAttribute('aria-current')
      expect(settingsLink).not.toHaveAttribute('aria-current')
    })
  })

  describe('Styling', () => {
    it('applies base navigation styles', () => {
      render(<Navigation />)

      const nav = screen.getByRole('navigation')
      const classList = nav.className

      expect(classList).toBeTruthy()
    })

    it('applies different styles to active link', () => {
      mockUsePathname.mockReturnValue('/courses')

      render(<Navigation />)

      const coursesLink = screen.getByRole('link', { name: /courses/i })
      const settingsLink = screen.getByRole('link', { name: /settings/i })

      const coursesClasses = coursesLink.className
      const settingsClasses = settingsLink.className

      expect(coursesClasses).not.toBe(settingsClasses)
    })
  })

  describe('Accessibility', () => {
    it('all links are keyboard accessible', () => {
      render(<Navigation />)

      const links = screen.getAllByRole('link')

      links.forEach((link) => {
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href')
      })
    })

    it('has proper semantic structure', () => {
      render(<Navigation />)

      const nav = screen.getByRole('navigation')
      const links = screen.getAllByRole('link')

      expect(nav).toBeInTheDocument()
      expect(links.length).toBeGreaterThan(0)
    })
  })
})
