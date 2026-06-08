'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Loader2,
  Settings,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

import AdvisorGuard from '../../components/AdvisorGuard'
import { useUserSession } from '@/stores/useUserSession'
import { getOrgDashboard, OrgDashboardData } from '@/services/advisor'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AD'
}

function daysAgo(dateStr: string | null) {
  if (!dateStr) return 'Pendente'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

export default function OrgDashboardPage() {
  const router = useRouter()
  const session = useUserSession((s) => s.user)
  const [data, setData] = useState<OrgDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const orgName = session?.userData?.user?.name || 'Organização'

  useEffect(() => {
    getOrgDashboard()
      .then(setData)
      .catch((err: any) => toast.error(err?.message || 'Erro ao carregar dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  const kpis = data
    ? [
        {
          label: 'Advisors ativos',
          value: data.kpis.activeAdvisors,
          detail: `${data.kpis.totalAdvisors} no total`,
          sub: data.kpis.pendingAdvisors > 0 ? `${data.kpis.pendingAdvisors} convite(s) pendente(s)` : null,
          Icon: UserCheck,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        },
        {
          label: 'Clientes no ecossistema',
          value: data.kpis.totalClients,
          detail: `${data.kpis.totalClients} vinculados`,
          sub: null,
          Icon: UsersRound,
          color: 'text-[#2F6E91]',
          bg: 'bg-[#EAF4FA]',
        },
        {
          label: 'Novos advisors este mês',
          value: data.kpis.newAdvisorsThisMonth,
          detail: 'entraram este mês',
          sub: null,
          Icon: TrendingUp,
          color: 'text-violet-600',
          bg: 'bg-violet-50',
        },
        {
          label: 'Convites de cliente pendentes',
          value: data.kpis.totalPendingClientInvites,
          detail: 'aguardando aceite',
          sub: null,
          Icon: ClipboardList,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        },
      ]
    : []

  return (
    <AdvisorGuard>
      <main className="w-full px-4 pb-28 pt-6 md:px-6 lg:pb-10 lg:pt-0">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">

          {/* Header */}
          <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4FA] text-[#2F6E91]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#2F6E91]">Dashboard da Organização</p>
                  <h1 className="text-xl font-semibold text-[#253140]">{orgName}</h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/advisor/organization')}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Users className="h-4 w-4" />
                  Gerenciar advisors
                </button>
              </div>
            </div>
          </header>

          {/* KPIs */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map(({ label, value, detail, sub, Icon, color, bg }) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="mt-2 text-3xl font-bold text-[#253140]">{value}</p>
                      </div>
                      <div className={['flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', bg].join(' ')}>
                        <Icon className={['h-5 w-5', color].join(' ')} />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{detail}</p>
                    {sub && <p className="mt-0.5 text-xs text-amber-600">{sub}</p>}
                  </div>
                ))}
              </section>

              {/* Advisors da org */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#253140]">Advisors da organização</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Visão consolidada de desempenho.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/advisor/organization')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F6E91] hover:underline"
                  >
                    Ver gestão completa
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {data!.advisors.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <UserPlus className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Nenhum advisor na organização ainda.</p>
                    <button
                      type="button"
                      onClick={() => router.push('/advisor/organization')}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-[#3f86b0]"
                    >
                      <UserPlus className="h-4 w-4" />
                      Adicionar advisor
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="divide-y divide-slate-100 md:hidden">
                      {data!.advisors.map((advisor) => (
                        <div key={advisor.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                            {initials(advisor.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#253140]">{advisor.name}</p>
                            <p className="truncate text-xs text-slate-500">{advisor.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#253140]">{advisor.activeClients}</p>
                            <p className="text-[10px] text-slate-400">clientes</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[700px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase text-slate-500">
                            <th className="px-5 pb-3 pt-4">Advisor</th>
                            <th className="pb-3 pt-4">Status</th>
                            <th className="pb-3 pt-4">Clientes ativos</th>
                            <th className="pb-3 pt-4">Convites pendentes</th>
                            <th className="pb-3 pt-4">Entrou em</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data!.advisors.map((advisor) => (
                            <tr key={advisor.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                                    {initials(advisor.name)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#253140]">{advisor.name}</p>
                                    <p className="text-xs text-slate-500">{advisor.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <span className={[
                                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                                  advisor.status === 'active'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-amber-200 bg-amber-50 text-amber-700',
                                ].join(' ')}>
                                  {advisor.status === 'active' ? 'Ativo' : 'Pendente'}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-[#253140]">{advisor.activeClients}</td>
                              <td className="py-3 text-slate-600">{advisor.pendingClientInvites}</td>
                              <td className="py-3 text-slate-500">{daysAgo(advisor.joinedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Toaster />
    </AdvisorGuard>
  )
}

