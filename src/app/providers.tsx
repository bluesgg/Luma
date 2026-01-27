'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { I18nProvider } from '@/lib/i18n/context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </I18nProvider>
    </QueryClientProvider>
  )
}
