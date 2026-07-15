'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { useCookieConsent } from './CookieConsentProvider'

// Vercel Analytics/Speed Insights são cookieless, mas ainda coletam dados de
// uso — carregados apenas sob consentimento de análise, por consistência LGPD.
export default function GatedAnalytics() {
  const { consent } = useCookieConsent()
  if (!consent.analytics) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
