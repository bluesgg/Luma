'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuotaDetails, LanguageSettings } from '@/components/settings'
import { useI18n } from '@/lib/i18n/context'

export default function SettingsPage() {
  const { t } = useI18n()

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('settings.description')}
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="quota" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quota">{t('settings.quotaTab')}</TabsTrigger>
            <TabsTrigger value="preferences">
              {t('settings.preferencesTab')}
            </TabsTrigger>
            <TabsTrigger value="profile" disabled>
              {t('settings.profileTab')}
            </TabsTrigger>
            <TabsTrigger value="security" disabled>
              {t('settings.securityTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quota" className="space-y-6">
            <QuotaDetails />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <LanguageSettings />
          </TabsContent>

          <TabsContent value="profile">
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              {t('settings.profileComingSoon')}
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              {t('settings.securityComingSoon')}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
