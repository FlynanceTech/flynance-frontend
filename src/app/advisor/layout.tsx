'use client'

import { ThemeProvider } from '@/providers/ThemeProvider'
import { UserThemeProvider } from '@/providers/UserThemeProvider'

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserThemeProvider>{children}</UserThemeProvider>
    </ThemeProvider>
  )
}
