'use client'

import { useCookieConsent } from './CookieConsentProvider'

export default function CookiePreferencesButton({ className }: { className?: string }) {
  const { openPreferences } = useCookieConsent()

  return (
    <button type="button" onClick={openPreferences} className={className}>
      Preferências de cookies
    </button>
  )
}
