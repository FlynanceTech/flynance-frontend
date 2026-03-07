'use client'

import { ReactNode, useEffect, useMemo } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'
import { APP_MESSAGES, resolveAppLocale } from '@/i18n/messages'

export function IntlProvider({ children }: { children: ReactNode }) {
  const preferences = useUserPreferencesStore((state) => state.preferences)

  const locale = resolveAppLocale(preferences?.locale)
  const messages = useMemo(() => APP_MESSAGES[locale], [locale])
  const timeZone = String(preferences?.timezone ?? 'America/Sao_Paulo')

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
  }, [locale])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  )
}
