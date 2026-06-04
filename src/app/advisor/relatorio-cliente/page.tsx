import { Suspense } from 'react'

import AdvisorClientReportClient from './AdvisorClientReportClient'

function AdvisorClientReportFallback() {
  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 py-8 text-[#253140]">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Carregando relatório consultivo...</p>
      </section>
    </main>
  )
}

export default function AdvisorClientReportPage() {
  return (
    <Suspense fallback={<AdvisorClientReportFallback />}>
      <AdvisorClientReportClient />
    </Suspense>
  )
}
