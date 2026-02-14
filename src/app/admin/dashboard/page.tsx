'use client'

import { useAdminMetrics } from '@/hooks/query/useAdmin'
import { Users, UserCheck, UserSquare2, UserRoundPlus } from 'lucide-react'

function MetricCard({
  title,
  total,
  new7d,
  new30d,
  icon,
}: {
  title: string
  total: number
  new7d: number
  new30d: number
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-[#1F2A37]">{total}</p>
        </div>
        <div className="rounded-xl bg-[#EAF4FA] p-2 text-[#1A6A96]">{icon}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-500">Novos 7d</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{new7d}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-500">Novos 30d</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{new30d}</p>
        </div>
      </div>
    </article>
  )
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[170px] rounded-2xl border border-slate-200 bg-white animate-pulse"
        />
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const metricsQuery = useAdminMetrics()

  if (metricsQuery.isLoading) return <MetricsSkeleton />

  if (metricsQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Nao foi possivel carregar as metricas do admin.
      </div>
    )
  }

  const metrics = metricsQuery.data

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total usuarios"
          total={metrics?.users.total ?? 0}
          new7d={metrics?.users.new7d ?? 0}
          new30d={metrics?.users.new30d ?? 0}
          icon={<Users size={18} />}
        />
        <MetricCard
          title="Total clientes"
          total={metrics?.clients.total ?? 0}
          new7d={metrics?.clients.new7d ?? 0}
          new30d={metrics?.clients.new30d ?? 0}
          icon={<UserCheck size={18} />}
        />
        <MetricCard
          title="Total advisors"
          total={metrics?.advisors.total ?? 0}
          new7d={metrics?.advisors.new7d ?? 0}
          new30d={metrics?.advisors.new30d ?? 0}
          icon={<UserSquare2 size={18} />}
        />
        <MetricCard
          title="Leads capturados"
          total={metrics?.leads.total ?? 0}
          new7d={metrics?.leads.new7d ?? 0}
          new30d={metrics?.leads.new30d ?? 0}
          icon={<UserRoundPlus size={18} />}
        />
      </div>
    </section>
  )
}
