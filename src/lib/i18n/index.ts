/**
 * i18n Translation System
 * Simple translation system supporting English and Chinese
 */

export type Locale = 'en' | 'zh'

export interface TranslationKey {
  [key: string]: string | TranslationKey
}

export interface Translations {
  en: TranslationKey
  zh: TranslationKey
}

/**
 * i18n Class
 * Manages locale and translation lookups
 */
export class I18n {
  private locale: Locale
  private translations: Translations

  constructor(translations: Translations, initialLocale: Locale = 'en') {
    this.translations = translations
    this.locale = initialLocale
  }

  /**
   * Set current locale
   */
  setLocale(locale: Locale): void {
    this.locale = locale
  }

  /**
   * Get current locale
   */
  getLocale(): Locale {
    return this.locale
  }

  /**
   * Translate a key
   * @param key - Dot-separated translation key (e.g., 'common.save')
   * @param fallback - Optional fallback text if key not found
   * @returns Translated string
   */
  t(key: string, fallback?: string): string {
    if (!key) return fallback || key

    const keys = key.split('.')
    let value: any = this.translations[this.locale]

    // Try to find the key in the current locale
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Key not found in current locale, try English fallback
        value = this.translations.en
        for (const k2 of keys) {
          if (value && typeof value === 'object' && k2 in value) {
            value = value[k2]
          } else {
            // Not found in English either, return fallback or key
            return fallback || key
          }
        }
        return typeof value === 'string' ? value : fallback || key
      }
    }

    return typeof value === 'string' ? value : fallback || key
  }
}

/**
 * Create an i18n instance
 */
export function createI18n(
  translations: Translations,
  initialLocale: Locale = 'en'
): I18n {
  return new I18n(translations, initialLocale)
}
