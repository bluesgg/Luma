'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react'
import type { I18n, Locale } from './index'
import { createI18n } from './index'
import { usePreferences } from '@/hooks/use-preferences'
import enTranslations from './translations/en.json'
import zhTranslations from './translations/zh.json'

const translations = {
  en: enTranslations,
  zh: zhTranslations,
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
  i18n: I18n
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

/**
 * I18n Provider
 * Provides translation context to the app
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = usePreferences()
  const [locale, setLocaleState] = useState<Locale>('en')

  // Create i18n instance once - no need to recreate on locale change
  const i18n = useMemo(() => createI18n(translations, 'en'), [])

  // Update locale when preferences change
  useEffect(() => {
    if (preferences?.uiLocale) {
      const newLocale = preferences.uiLocale as Locale
      setLocaleState(newLocale)
      i18n.setLocale(newLocale)
    }
  }, [preferences?.uiLocale, i18n])

  // Set locale and update i18n instance
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    i18n.setLocale(newLocale)
  }

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: (key: string, fallback?: string) => i18n.t(key, fallback),
    i18n,
  }

  // Don't block rendering - show children with default locale while preferences load
  // This prevents blank screen during initial load

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * useI18n Hook
 * Access translation functions in components
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}
