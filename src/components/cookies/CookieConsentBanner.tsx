'use client'

import { useState } from 'react'
import LegalDocsModal from '@/components/ui/LegalDocsModal'
import { useCookieConsent } from './CookieConsentProvider'

export default function CookieConsentBanner() {
  const { consent, decided, acceptAll, save } = useCookieConsent()
  const [customize, setCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(consent.analytics)
  const [marketing, setMarketing] = useState(consent.marketing)
  const [showPolicy, setShowPolicy] = useState(false)

  // Revogar (desligar categoria já concedida) exige recarregar a página para
  // interromper scripts de terceiros já injetados na sessão.
  function persistAndMaybeReload(next: { analytics: boolean; marketing: boolean }) {
    const reducing =
      (consent.analytics && !next.analytics) || (consent.marketing && !next.marketing)
    save(next)
    if (decided && reducing && typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Consentimento de cookies"
        className="fixed inset-x-0 bottom-0 z-[9998] px-4 pb-4"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_60px_rgba(0,0,0,0.25)]">
          <h2 className="text-base font-semibold text-slate-900">Sua privacidade</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Usamos cookies necessários para o funcionamento do site e, com sua autorização,
            cookies de análise e marketing para melhorar sua experiência. Você pode aceitar,
            recusar ou escolher por categoria. Saiba mais na{' '}
            <button
              type="button"
              onClick={() => setShowPolicy(true)}
              className="text-primary underline underline-offset-2"
            >
              Política de Cookies
            </button>
            .
          </p>

          {customize && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked disabled className="mt-1" />
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Necessários</span> — essenciais
                  para o funcionamento do site. Sempre ativos.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Análise</span> — nos ajudam a
                  entender o uso do site (Google Tag Manager, Vercel Analytics).
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Marketing</span> — mensuração de
                  campanhas (Meta Pixel).
                </span>
              </label>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {customize ? (
              <button
                type="button"
                onClick={() => persistAndMaybeReload({ analytics, marketing })}
                className="rounded-md bg-gradient-to-r from-secondary to-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Salvar preferências
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCustomize(true)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Personalizar
              </button>
            )}
            <button
              type="button"
              onClick={() => persistAndMaybeReload({ analytics: false, marketing: false })}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Rejeitar não essenciais
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-md bg-gradient-to-r from-secondary to-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Aceitar todos
            </button>
          </div>
        </div>
      </div>

      <LegalDocsModal open={showPolicy} initialDoc="cookies" onClose={() => setShowPolicy(false)} />
    </>
  )
}
