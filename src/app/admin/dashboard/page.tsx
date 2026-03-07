'use client'

import { useAdminMetrics } from '@/hooks/query/useAdmin'
import { Users, UserCheck, UserSquare2, UserRoundPlus } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
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
  new7dLabel,
  new30dLabel,
}: {
  title: string
  total: number
  new7d: number
  new30d: number
  icon: React.ReactNode
  new7dLabel: string
  new30dLabel: string
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
          <p className="text-slate-500">{new7dLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{new7d}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-slate-500">{new30dLabel}</p>
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

function numberTickFormatter(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)
}

function numberTooltipFormatter(value: unknown, locale: string) {
  const normalized = Array.isArray(value) ? value[0] : value
  return new Intl.NumberFormat(locale).format(Number(normalized ?? 0))
}

function pct(value: number, locale: string) {
  return `${value.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

type AdminDashboardMetrics = NonNullable<ReturnType<typeof useAdminMetrics>['data']>

function buildChartRows(
  metrics: AdminDashboardMetrics,
  t: (key: string, values?: Record<string, string | number | Date>) => string
) {
  return [
    {
      name: t('chartLabels.users'),
      total: metrics.users.total ?? 0,
      new7d: metrics.users.new7d ?? 0,
      new30d: metrics.users.new30d ?? 0,
    },
    {
      name: t('chartLabels.clients'),
      total: metrics.clients.total ?? 0,
      new7d: metrics.clients.new7d ?? 0,
      new30d: metrics.clients.new30d ?? 0,
    },
    {
      name: t('chartLabels.advisors'),
      total: metrics.advisors.total ?? 0,
      new7d: metrics.advisors.new7d ?? 0,
      new30d: metrics.advisors.new30d ?? 0,
    },
    {
      name: t('chartLabels.leads'),
      total: metrics.leads.total ?? 0,
      new7d: metrics.leads.new7d ?? 0,
      new30d: metrics.leads.new30d ?? 0,
    },
  ]
}

function toLeadStatusLabel(
  status: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string
) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) return t('leadStatus.empty')
  if (normalized === 'no_signature_id') return t('leadStatus.noSignature')

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function buildLeadsStatusRows(
  metrics: AdminDashboardMetrics,
  t: (key: string, values?: Record<string, string | number | Date>) => string
) {
  const source = metrics.leadsByStatus ?? {}
  const rows = Object.entries(source)
    .map(([status, value]) => {
      const count = Number(value)
      return {
        status,
        label: toLeadStatusLabel(status, t),
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
  const t = useTranslations('adminDashboardPage')
  const locale = useLocale()
  const rows = buildChartRows(metrics, t)
  const leadsStatusRows = buildLeadsStatusRows(metrics, t)
  const baseSemLeads = (metrics.clients.total ?? 0) + (metrics.advisors.total ?? 0)
  const totalComLeads = baseSemLeads + (metrics.leads.total ?? 0)
  const leadsRate = totalComLeads > 0 ? ((metrics.leads.total ?? 0) / totalComLeads) * 100 : 0
  const conversionRate = totalComLeads > 0 ? ((metrics.clients.total ?? 0) / totalComLeads) * 100 : 0
  const pieColors = ['#4F98C2', '#66B4E0', '#8ED0F0', '#C8E7F8', '#6EB89F', '#A9C4D6']

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard title={t('charts.baseByProfile.title')} subtitle={t('charts.baseByProfile.subtitle')}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tickFormatter={(value) => numberTickFormatter(value, locale)} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip formatter={(value) => numberTooltipFormatter(value, locale)} />
              <Bar dataKey="total" name={t('chartLabels.total')} fill="#4F98C2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title={t('charts.newSignups.title')} subtitle={t('charts.newSignups.subtitle')}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tickFormatter={(value) => numberTickFormatter(value, locale)} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip formatter={(value) => numberTooltipFormatter(value, locale)} />
              <Bar dataKey="new7d" name={t('cards.new7d')} fill="#7FC3E5" radius={[8, 8, 0, 0]} />
              <Bar dataKey="new30d" name={t('cards.new30d')} fill="#4F98C2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title={t('charts.leadsByStatus.title')} subtitle={t('charts.leadsByStatus.subtitle')}>
        <div className="h-[240px]">
          {leadsStatusRows.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
              {t('charts.leadsByStatus.empty')}
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
                <Tooltip formatter={(value) => numberTooltipFormatter(value, locale)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">{t('metrics.leadsRate')}</p>
            <p className="mt-1 font-semibold text-slate-700">{pct(leadsRate, locale)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">{t('metrics.conversionRate')}</p>
            <p className="mt-1 font-semibold text-slate-700">{pct(conversionRate, locale)}</p>
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
  const t = useTranslations('adminDashboardPage')
  const metricsQuery = useAdminMetrics()

  if (metricsQuery.isLoading) return <MetricsSkeleton />

  if (metricsQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('errors.loadMetrics')}
      </div>
    )
  }

  const metrics = metricsQuery.data

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t('cards.totalUsers')}
          total={metrics?.users.total ?? 0}
          new7d={metrics?.users.new7d ?? 0}
          new30d={metrics?.users.new30d ?? 0}
          icon={<Users size={18} />}
          new7dLabel={t('cards.new7d')}
          new30dLabel={t('cards.new30d')}
        />
        <MetricCard
          title={t('cards.totalClients')}
          total={metrics?.clients.total ?? 0}
          new7d={metrics?.clients.new7d ?? 0}
          new30d={metrics?.clients.new30d ?? 0}
          icon={<UserCheck size={18} />}
          new7dLabel={t('cards.new7d')}
          new30dLabel={t('cards.new30d')}
        />
        <MetricCard
          title={t('cards.totalAdvisors')}
          total={metrics?.advisors.total ?? 0}
          new7d={metrics?.advisors.new7d ?? 0}
          new30d={metrics?.advisors.new30d ?? 0}
          icon={<UserSquare2 size={18} />}
          new7dLabel={t('cards.new7d')}
          new30dLabel={t('cards.new30d')}
        />
        <MetricCard
          title={t('cards.capturedLeads')}
          total={metrics?.leads.total ?? 0}
          new7d={metrics?.leads.new7d ?? 0}
          new30d={metrics?.leads.new30d ?? 0}
          icon={<UserRoundPlus size={18} />}
          new7dLabel={t('cards.new7d')}
          new30dLabel={t('cards.new30d')}
        />
      </div>

      {metrics ? <AdminCharts metrics={metrics} /> : null}
    </section>
  )
}
