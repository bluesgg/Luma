import type { ReactNode } from 'react'
import { Navigation } from '@/components/layout/navigation'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main role="main" id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  )
}
