'use client'

import { useAdminMetrics } from '@/hooks/query/useAdmin'
import { Users, UserCheck, UserSquare2, UserRoundPlus } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[170px] rounded-2xl border border-slate-200 bg-white animate-pulse"
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[330px] rounded-2xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-[330px] rounded-2xl border border-slate-200 bg-white animate-pulse" />
      </div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-[#1F2A37]">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </header>
      {children}
    </article>
  )
}

function numberTickFormatter(value: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value)
}

function numberTooltipFormatter(value: number | string) {
  return new Intl.NumberFormat('pt-BR').format(Number(value))
}

function pct(value: number) {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

type AdminDashboardMetrics = NonNullable<ReturnType<typeof useAdminMetrics>['data']>

function buildChartRows(metrics: AdminDashboardMetrics) {
  return [
    {
      name: 'Usuarios',
      total: metrics.users.total ?? 0,
      new7d: metrics.users.new7d ?? 0,
      new30d: metrics.users.new30d ?? 0,
    },
    {
      name: 'Clientes',
      total: metrics.clients.total ?? 0,
      new7d: metrics.clients.new7d ?? 0,
      new30d: metrics.clients.new30d ?? 0,
    },
    {
      name: 'Advisors',
      total: metrics.advisors.total ?? 0,
      new7d: metrics.advisors.new7d ?? 0,
      new30d: metrics.advisors.new30d ?? 0,
    },
    {
      name: 'Leads',
      total: metrics.leads.total ?? 0,
      new7d: metrics.leads.new7d ?? 0,
      new30d: metrics.leads.new30d ?? 0,
    },
  ]
}

function toLeadStatusLabel(status: string) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) return 'Sem status'
  if (normalized === 'no_signature_id') return 'Sem assinatura'

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function buildLeadsStatusRows(metrics: AdminDashboardMetrics) {
  const source = metrics.leadsByStatus ?? {}
  const rows = Object.entries(source)
    .map(([status, value]) => {
      const count = Number(value)
      return {
        status,
        label: toLeadStatusLabel(status),
        value: Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0,
      }
    })
    .filter((item) => item.value > 0)

  return rows
}

function AdminCharts({
  metrics,
}: {
  metrics: AdminDashboardMetrics
}) {
  const rows = buildChartRows(metrics)
  const leadsStatusRows = buildLeadsStatusRows(metrics)
  const baseSemLeads = (metrics.clients.total ?? 0) + (metrics.advisors.total ?? 0)
  const totalComLeads = baseSemLeads + (metrics.leads.total ?? 0)
  const leadsRate = totalComLeads > 0 ? ((metrics.leads.total ?? 0) / totalComLeads) * 100 : 0
  const conversionRate = totalComLeads > 0 ? ((metrics.clients.total ?? 0) / totalComLeads) * 100 : 0
  const pieColors = ['#4F98C2', '#66B4E0', '#8ED0F0', '#C8E7F8', '#6EB89F', '#A9C4D6']

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard title="Base atual por perfil" subtitle="Comparativo de volumes atuais">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tickFormatter={numberTickFormatter} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip formatter={numberTooltipFormatter} />
              <Bar dataKey="total" name="Total" fill="#4F98C2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Novos cadastros" subtitle="Janela dos ultimos 7 e 30 dias">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tickFormatter={numberTickFormatter} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip formatter={numberTooltipFormatter} />
              <Bar dataKey="new7d" name="Novos 7d" fill="#7FC3E5" radius={[8, 8, 0, 0]} />
              <Bar dataKey="new30d" name="Novos 30d" fill="#4F98C2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Distribuicao de leads por status" subtitle="Leads capturados por situacao">
        <div className="h-[240px]">
          {leadsStatusRows.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
              Sem dados de status de leads.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadsStatusRows}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {leadsStatusRows.map((row, index) => (
                    <Cell key={`cell-${row.status}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={numberTooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Taxa de leads</p>
            <p className="mt-1 font-semibold text-slate-700">{pct(leadsRate)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Conversao em clientes</p>
            <p className="mt-1 font-semibold text-slate-700">{pct(conversionRate)}</p>
          </div>
        </div>

        {leadsStatusRows.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600">
            {leadsStatusRows.map((item, index) => (
              <div key={item.status} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span>{item.label}</span>
                </div>
                <span className="font-semibold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
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

      {metrics ? <AdminCharts metrics={metrics} /> : null}
    </section>
  )
}
