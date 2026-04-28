'use client'

import Header from '../components/Header'

function ControlCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="h-12 animate-pulse bg-gray-200" />
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="flex items-end justify-between gap-4 pt-2">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
            <div className="h-5 w-5 animate-pulse rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ControlsPageSkeleton() {
  return (
    <section className="flex h-full w-full flex-col gap-6 overflow-auto px-4 pb-24 pt-8 lg:px-8 lg:pb-0">
      <Header title="Metas e limites do seu mês" subtitle="" newTransation={false} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-56 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-28 animate-pulse rounded-full bg-gray-100" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded-full bg-gray-200" />
        </div>

        <div className="h-10 w-full max-w-sm animate-pulse rounded-full bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ControlCardSkeleton key={index} />
        ))}
      </div>
    </section>
  )
}
