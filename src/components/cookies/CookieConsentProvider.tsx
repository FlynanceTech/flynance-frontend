'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DENY_ALL,
  GRANT_ALL,
  readConsent,
  writeConsent,
  type ConsentCategories,
} from '@/lib/cookieConsent'
import CookieConsentBanner from './CookieConsentBanner'

type CookieConsentContextValue = {
  /** categorias efetivamente concedidas (necessários são sempre implícitos) */
  consent: ConsentCategories
  /** já houve decisão registrada (cookie presente) */
  decided: boolean
  /** provider montado no cliente — evita ler cookie no SSR */
  ready: boolean
  bannerOpen: boolean
  acceptAll: () => void
  rejectAll: () => void
  save: (categories: ConsentCategories) => void
  openPreferences: () => void
  closeBanner: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) {
    throw new Error('useCookieConsent deve ser usado dentro de CookieConsentProvider')
  }
  return ctx
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [decided, setDecided] = useState(false)
  const [consent, setConsent] = useState<ConsentCategories>(DENY_ALL)
  const [bannerOpen, setBannerOpen] = useState(false)

  // Lê a decisão salva só no cliente, após montar.
  useEffect(() => {
    const saved = readConsent()
    if (saved) {
      setConsent({ analytics: saved.analytics, marketing: saved.marketing })
      setDecided(true)
    } else {
      setBannerOpen(true)
    }
    setReady(true)
  }, [])

  const persist = useCallback((categories: ConsentCategories) => {
    writeConsent(categories)
    setConsent(categories)
    setDecided(true)
    setBannerOpen(false)
  }, [])

  const acceptAll = useCallback(() => persist(GRANT_ALL), [persist])
  const rejectAll = useCallback(() => persist(DENY_ALL), [persist])
  const save = useCallback((categories: ConsentCategories) => persist(categories), [persist])
  const openPreferences = useCallback(() => setBannerOpen(true), [])
  const closeBanner = useCallback(() => {
    // Só permite fechar sem decidir se já houve uma decisão anterior.
    setBannerOpen((open) => (decided ? false : open))
  }, [decided])

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      decided,
      ready,
      bannerOpen,
      acceptAll,
      rejectAll,
      save,
      openPreferences,
      closeBanner,
    }),
    [consent, decided, ready, bannerOpen, acceptAll, rejectAll, save, openPreferences, closeBanner]
  )

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {ready && bannerOpen && <CookieConsentBanner />}
    </CookieConsentContext.Provider>
  )
}

export default CookieConsentProvider
