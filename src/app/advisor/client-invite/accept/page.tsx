import { Suspense } from 'react'
import AdvisorClientInviteAcceptClient from './AdvisorClientInviteAcceptClient'

function InviteAcceptFallback() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-8">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Carregando convite...</p>
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
