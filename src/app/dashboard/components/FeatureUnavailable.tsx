'use client'

import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export default function FeatureUnavailable() {
  return (
    <section className="flex min-h-[70vh] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-[#121212]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-[#F4C542]/12 dark:text-[#F4C542]">
          <RefreshCw className="h-5 w-5" />
        </div>

        <h1 className="text-2xl font-semibold text-[#333C4D] dark:text-white">
          Funcionalidade em atualização
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">
          Estamos preparando uma nova experiência para essa área da Flynance.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition hover:bg-secondary hover:text-black dark:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </div>
    </section>
  )
}
