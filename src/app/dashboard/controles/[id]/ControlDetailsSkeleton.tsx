'use client'

export default function ControlDetailsSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-auto pb-16 lg:pr-8 lg:pb-0">
      <div className="flex flex-col gap-4 rounded-b-3xl rounded-t-none bg-white p-8 text-gray-600 lg:rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="h-6 w-6 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-6 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-40 animate-pulse rounded-full bg-slate-100" />
        </div>

        <div className="grid grid-cols-2 rounded-b-2xl rounded-md bg-white p-4 text-gray-500 lg:p-0">
          <div className="flex flex-col items-center justify-center gap-3 border-r border-gray-200 py-4">
            <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <div className="h-6 w-28 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-8 pt-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-2 w-full animate-pulse rounded-full bg-slate-200" />
      </div>

      <div className="flex flex-col gap-4 p-8 pt-4">
        <div className="rounded-xl bg-white p-4">
          <div className="mb-4 h-[300px] animate-pulse rounded bg-slate-100" />
          <div className="mx-auto h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="mt-3 h-4 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
