export default function LoadingSkeleton() {
  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-gray-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[320px] rounded-2xl border border-gray-200 bg-white animate-pulse" />
        <div className="h-[320px] rounded-2xl border border-gray-200 bg-white animate-pulse" />
      </div>
      <div className="h-[260px] rounded-2xl border border-gray-200 bg-white animate-pulse" />
    </section>
  )
}
