'use client'

import { Suspense } from 'react'
import AdvisorClientInviteAcceptClient from './AdvisorClientInviteAcceptClient'
import { useTranslations } from 'next-intl'

function InviteAcceptFallback() {
  const t = useTranslations('advisorClientInviteAcceptPage')
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))] transition-colors">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">{t('loadingInvite')}</p>
      </section>
    </main>
  )
}

export default function AdvisorClientInviteAcceptPage() {
  return (
    <Suspense fallback={<InviteAcceptFallback />}>
      <AdvisorClientInviteAcceptClient />
    </Suspense>
  )
}
