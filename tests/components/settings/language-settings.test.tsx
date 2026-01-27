// =============================================================================
// Phase 6: User Settings - Language Settings Component Tests (TDD)
// Testing the language preference selection component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Component to be implemented
const LanguageSettings = () => <div>Language Settings Component</div>

// Wrapper for tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('LanguageSettings Component (Phase 6 - SETTINGS-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Rendering', () => {
    it('should render language settings section', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(
          screen.getByText(/language|语言/i, { selector: 'h2, h3' })
        ).toBeInTheDocument()
      })
    })

    it('should render UI language dropdown', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(
          screen.getByLabelText(/interface language|界面语言/i)
        ).toBeInTheDocument()
      })
    })

    it('should render AI explanation language dropdown', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(
          screen.getByLabelText(/ai.*language|AI.*语言/i)
        ).toBeInTheDocument()
      })
    })

    it('should show current UI locale selection', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'zh',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        const uiSelect = screen.getByLabelText(/interface language|界面语言/i)
        expect(uiSelect).toHaveValue('zh')
      })
    })

    it('should show current explain locale selection', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'zh',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        const explainSelect = screen.getByLabelText(/ai.*language|AI.*语言/i)
        expect(explainSelect).toHaveValue('zh')
      })
    })
  })

  describe('Language Options', () => {
    it('should show English and Chinese options for UI language', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.click(select)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /english/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /中文|chinese/i })).toBeInTheDocument()
      })
    })

    it('should show English and Chinese options for explain language', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/ai.*language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/ai.*language/i)
      await user.click(select)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /english/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /中文|chinese/i })).toBeInTheDocument()
      })
    })
  })

  describe('UI Locale Change', () => {
    it('should update UI locale when selection changes', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'zh',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/preferences',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ uiLocale: 'zh' }),
          })
        )
      })
    })

    it('should show success feedback after UI locale change', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'zh',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(
          screen.getByText(/saved|updated|success/i)
        ).toBeInTheDocument()
      })
    })

    it('should persist UI locale selection', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'zh',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(select).toHaveValue('zh')
      })
    })
  })

  describe('Explain Locale Change', () => {
    it('should update explain locale when selection changes', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'zh',
              updatedAt: new Date().toISOString(),
            },
          }),
        })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/ai.*language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/ai.*language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/preferences',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ explainLocale: 'zh' }),
          })
        )
      })
    })

    it('should show success feedback after explain locale change', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'zh',
              updatedAt: new Date().toISOString(),
            },
          }),
        })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/ai.*language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/ai.*language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(
          screen.getByText(/saved|updated|success/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Independent Selections', () => {
    it('should allow different locales for UI and explain', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'zh',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        const uiSelect = screen.getByLabelText(/interface language/i)
        const explainSelect = screen.getByLabelText(/ai.*language/i)

        expect(uiSelect).toHaveValue('en')
        expect(explainSelect).toHaveValue('zh')
      })
    })

    it('should not affect explain locale when changing UI locale', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'zh',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'zh',
              explainLocale: 'zh',
              updatedAt: new Date().toISOString(),
            },
          }),
        })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const uiSelect = screen.getByLabelText(/interface language/i)
      await user.selectOptions(uiSelect, 'zh')

      await waitFor(() => {
        const explainSelect = screen.getByLabelText(/ai.*language/i)
        expect(explainSelect).toHaveValue('zh')
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state while fetching preferences', () => {
      ;(global.fetch as any).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: {
                      id: 'pref-1',
                      userId: 'user-1',
                      uiLocale: 'en',
                      explainLocale: 'en',
                      updatedAt: new Date().toISOString(),
                    },
                  }),
                }),
              100
            )
          )
      )

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      expect(
        screen.getByText(/loading|加载中/i)
      ).toBeInTheDocument()
    })

    it('should disable dropdowns while updating', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({
                      success: true,
                      data: {
                        id: 'pref-1',
                        userId: 'user-1',
                        uiLocale: 'zh',
                        explainLocale: 'en',
                        updatedAt: new Date().toISOString(),
                      },
                    }),
                  }),
                100
              )
            )
        )

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(select).toBeDisabled()
      })

      await waitFor(() => {
        expect(select).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message when update fails', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockRejectedValueOnce(new Error('Update failed'))

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(screen.getByText(/error|failed|错误/i)).toBeInTheDocument()
      })
    })

    it('should revert selection on error', async () => {
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pref-1',
              userId: 'user-1',
              uiLocale: 'en',
              explainLocale: 'en',
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .mockRejectedValueOnce(new Error('Failed'))

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      const select = screen.getByLabelText(/interface language/i)
      await user.selectOptions(select, 'zh')

      await waitFor(() => {
        expect(select).toHaveValue('en') // Reverted
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible labels for dropdowns', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        const uiSelect = screen.getByLabelText(/interface language/i)
        const explainSelect = screen.getByLabelText(/ai.*language/i)

        expect(uiSelect).toHaveAccessibleName()
        expect(explainSelect).toHaveAccessibleName()
      })
    })

    it('should be keyboard navigable', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      const user = userEvent.setup()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(screen.getByLabelText(/interface language/i)).toBeInTheDocument()
      })

      await user.tab()
      expect(screen.getByLabelText(/interface language/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/ai.*language/i)).toHaveFocus()
    })
  })

  describe('Help Text', () => {
    it('should display help text for UI language', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(
          screen.getByText(/language.*interface|界面.*语言/i)
        ).toBeInTheDocument()
      })
    })

    it('should display help text for explain language', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'pref-1',
            userId: 'user-1',
            uiLocale: 'en',
            explainLocale: 'en',
            updatedAt: new Date().toISOString(),
          },
        }),
      })

      const Wrapper = createWrapper()
      render(<LanguageSettings />, { wrapper: Wrapper })

      await waitFor(() => {
        expect(
          screen.getByText(/ai.*explanation|AI.*讲解/i)
        ).toBeInTheDocument()
      })
    })
  })
})
