'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePreferences } from '@/hooks'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/lib/i18n/context'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * LanguageSettings Component
 * Allows users to configure UI and AI explanation languages
 */
export function LanguageSettings() {
  const { preferences, isLoading, error, updatePreferences, isUpdating } =
    usePreferences()
  const { toast } = useToast()
  const { t } = useI18n()
  const [showSuccess, setShowSuccess] = React.useState(false)

  // Handle UI locale change
  const handleUiLocaleChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLocale = event.target.value as 'en' | 'zh'
    updatePreferences(
      { uiLocale: newLocale },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          toast({
            title: t('common.success'),
            description: t('settings.saved'),
          })
        },
        onError: (error) => {
          toast({
            title: t('common.error'),
            description: error.message || t('settings.saveFailed'),
            variant: 'destructive',
          })
        },
      }
    )
  }

  // Handle explain locale change
  const handleExplainLocaleChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLocale = event.target.value as 'en' | 'zh'
    updatePreferences(
      { explainLocale: newLocale },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          toast({
            title: t('common.success'),
            description: t('settings.saved'),
          })
        },
        onError: (error) => {
          toast({
            title: t('common.error'),
            description: error.message || t('settings.saveFailed'),
            variant: 'destructive',
          })
        },
      }
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>
            {t('settings.uiLanguageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>
            {t('settings.uiLanguageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('settings.loadFailed')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.language')}</CardTitle>
        <CardDescription>{t('settings.languageDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success message */}
        {showSuccess && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{t('settings.saved')}</AlertDescription>
          </Alert>
        )}

        {/* UI Language Selection */}
        <div className="space-y-3">
          <Label htmlFor="uiLocale">{t('settings.uiLanguage')}</Label>
          <select
            id="uiLocale"
            name="uiLocale"
            aria-label={t('settings.uiLanguage')}
            value={preferences.uiLocale}
            onChange={handleUiLocaleChange}
            disabled={isUpdating}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="en">{t('languages.en')}</option>
            <option value="zh">{t('languages.zh')}</option>
          </select>
          <p className="text-sm text-muted-foreground">
            {t('settings.uiLanguageDescription')}
          </p>
        </div>

        {/* Explain Language Selection */}
        <div className="space-y-3">
          <Label htmlFor="explainLocale">{t('settings.explainLanguage')}</Label>
          <select
            id="explainLocale"
            name="explainLocale"
            aria-label={t('settings.explainLanguage')}
            value={preferences.explainLocale}
            onChange={handleExplainLocaleChange}
            disabled={isUpdating}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="en">{t('languages.en')}</option>
            <option value="zh">{t('languages.zh')}</option>
          </select>
          <p className="text-sm text-muted-foreground">
            {t('settings.explainLanguageDescription')}
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertDescription className="text-sm">
            {t('settings.languageChangeInfo')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
