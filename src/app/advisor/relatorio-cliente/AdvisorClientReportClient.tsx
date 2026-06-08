'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import toast, { Toaster } from 'react-hot-toast'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  PieChart,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
} from 'lucide-react'

import AdvisorGuard from '../components/AdvisorGuard'
import { useAdvisorClients } from '@/hooks/query/useAdvisor'
import type { AdvisorClient } from '@/services/advisor'
import { useAdvisorActing } from '@/stores/useAdvisorActing'

type PeriodKey = '30D' | '3M' | '6M' | '12M' | 'CUSTOM'
type ViewMode = 'CONSOLIDATED' | 'PERSON_1' | 'PERSON_2'
type ReportStatus = 'Excelente' | 'Atenção' | 'Crítico'

type ReportClient = AdvisorClient & {
  accountType: 'INDIVIDUAL' | 'COUPLE'
  coupleNames: string[]
  healthScore: number
  avgIncome: number
  avgExpense: number
  cash: number
  debt: number
  creditSpending: number
  savingRate: number
  debtRatio: number
  activeCards: number
  futureInstallments: number
  creditUsage: number
  consistency: number
  incomeStability: number
  goalHealth: number
  reserveCoverage: number
  launchFrequency: number
  categories: Array<{ label: string; amount: number; percentage: number; tone: string }>
  monthly: Array<{ label: string; income: number; expense: number; credit: number }>
  cards: Array<{ name: string; amount: number; closesAt: string; dueAt: string; tone: string }>
}

const periodOptions: Array<{ value: PeriodKey; label: string; months: number }> = [
  { value: '30D', label: 'Últimos 30 dias', months: 1 },
  { value: '3M', label: '3 meses', months: 3 },
  { value: '6M', label: '6 meses', months: 6 },
  { value: '12M', label: '12 meses', months: 12 },
  { value: 'CUSTOM', label: 'Personalizado', months: 6 },
]

const flyQuestions = [
  'Resumo do comportamento financeiro',
  'Categorias que mais cresceram',
  'Riscos identificados',
  'Como posso ajudar este cliente?',
]

function hashText(value: string) {
  return Array.from(value || 'client').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function formatMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale || 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale || 'pt-BR', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(Number(value || 0) / 100)
}

function isCoupleClient(client: AdvisorClient) {
  const name = String(client.name || '')
  return /\s(&|e|\+|\/)\s/i.test(name)
}

function coupleNames(client: AdvisorClient) {
  const pieces = String(client.name || '')
    .split(/\s(?:&|e|\+|\/)\s/i)
    .map((item) => item.trim())
    .filter(Boolean)

  return pieces.length >= 2 ? pieces.slice(0, 2) : [client.name || 'Cliente', 'Parceiro(a)']
}

function monthLabel(indexFromNow: number, locale: string) {
  const date = new Date()
  date.setMonth(date.getMonth() - indexFromNow)
  return new Intl.DateTimeFormat(locale || 'pt-BR', { month: 'short' }).format(date).replace('.', '')
}

function applyViewMode(base: ReportClient, viewMode: ViewMode): ReportClient {
  if (base.accountType !== 'COUPLE' || viewMode === 'CONSOLIDATED') return base

  const factor = viewMode === 'PERSON_1' ? 0.56 : 0.44
  const creditFactor = viewMode === 'PERSON_1' ? 0.48 : 0.52

  return {
    ...base,
    name: viewMode === 'PERSON_1' ? base.coupleNames[0] : base.coupleNames[1],
    avgIncome: base.avgIncome * factor,
    avgExpense: base.avgExpense * factor,
    cash: base.cash * factor,
    debt: base.debt * creditFactor,
    creditSpending: base.creditSpending * creditFactor,
    futureInstallments: base.futureInstallments * creditFactor,
    categories: base.categories.map((item) => ({
      ...item,
      amount: item.amount * (item.label === 'Crédito' ? creditFactor : factor),
    })),
    monthly: base.monthly.map((item) => ({
      ...item,
      income: item.income * factor,
      expense: item.expense * factor,
      credit: item.credit * creditFactor,
    })),
  }
}

function buildReportClient(client: AdvisorClient, period: PeriodKey, locale: string): ReportClient {
  const seed = hashText(client.id || client.clientUserId || client.name)
  const periodConfig = periodOptions.find((item) => item.value === period) ?? periodOptions[2]
  const accountType = isCoupleClient(client) ? 'COUPLE' : 'INDIVIDUAL'
  const income = Number(client.income || 0) || 9800 + (seed % 7200)
  const expense = Number(client.expense || 0) || income * (0.58 + (seed % 24) / 100)
  const balance = Number(client.balance || income - expense)
  const creditSpending = Math.max(1200, expense * (0.24 + (seed % 18) / 100))
  const debt = Math.max(0, creditSpending * (1.4 + (seed % 8) / 10))
  const cash = Math.max(3000, Math.abs(balance) + income * (1.2 + (seed % 5) / 10))
  const savingRate = clamp(((income - expense) / Math.max(1, income)) * 100, -18, 44)
  const debtRatio = clamp((debt / Math.max(1, income * 3)) * 100, 4, 92)
  const creditUsage = clamp((creditSpending / Math.max(1, income)) * 100, 6, 84)
  const launchFrequency = clamp(94 - ((seed % 16) * 4), 32, 98)
  const consistency = clamp(82 - debtRatio * 0.25 + savingRate * 0.45 + (seed % 11), 22, 98)
  const reserveCoverage = clamp((cash / Math.max(1, expense)) * 100, 18, 100)
  const incomeStability = clamp(78 + (seed % 18) - (periodConfig.months > 6 ? 3 : 0), 32, 96)
  const goalHealth = clamp(64 + savingRate * 0.6 - debtRatio * 0.1 + (seed % 14), 22, 98)
  const healthScore = clamp(
    consistency * 0.22 +
      (100 - creditUsage) * 0.16 +
      reserveCoverage * 0.16 +
      incomeStability * 0.14 +
      goalHealth * 0.14 +
      Math.max(0, 100 - debtRatio) * 0.18,
    12,
    98
  )

  const categoryBase = [
    ['Alimentação', 0.19, 'bg-[#78B7A0]'],
    ['Moradia', 0.22, 'bg-[#4F98C2]'],
    ['Transporte', 0.11, 'bg-[#E7B75F]'],
    ['Lazer', 0.09, 'bg-[#A78BFA]'],
    ['Assinaturas', 0.06, 'bg-[#64748B]'],
    ['Saúde', 0.08, 'bg-[#F08A8A]'],
    ['Investimentos', 0.13, 'bg-[#2F6E91]'],
    ['Crédito', 0.12, 'bg-[#F59E0B]'],
  ] as const

  const categories = categoryBase.map(([label, weight, tone], index) => {
    const adjustedWeight = weight + ((seed + index) % 6) / 100
    return {
      label,
      amount: expense * adjustedWeight,
      percentage: clamp(adjustedWeight * 100, 3, 36),
      tone,
    }
  })

  const monthly = Array.from({ length: 7 }, (_, index) => {
    const reverseIndex = 6 - index
    const wave = ((seed + index * 11) % 13) - 6
    const growth = 1 + (index - 3) * 0.018
    return {
      label: monthLabel(reverseIndex, locale),
      income: income * growth * (1 + wave / 100),
      expense: expense * (1 + (index - 2) * 0.015 + wave / 140),
      credit: creditSpending * (0.85 + index * 0.035 + (wave > 0 ? 0.05 : 0)),
    }
  })

  const activeCards = 2 + (seed % 3)
  const cards = [
    {
      name: 'Nubank',
      amount: creditSpending * 0.46,
      closesAt: '05/06',
      dueAt: '12/06',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    {
      name: 'XP Visa',
      amount: creditSpending * 0.31,
      closesAt: '09/06',
      dueAt: '16/06',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    {
      name: 'BTG Black',
      amount: creditSpending * 0.23,
      closesAt: '18/06',
      dueAt: '25/06',
      tone: 'border-sky-200 bg-sky-50 text-sky-700',
    },
  ].slice(0, activeCards)

  return {
    ...client,
    accountType,
    coupleNames: accountType === 'COUPLE' ? coupleNames(client) : [client.name || 'Cliente'],
    healthScore,
    avgIncome: income,
    avgExpense: expense,
    cash,
    debt,
    creditSpending,
    savingRate,
    debtRatio,
    activeCards,
    futureInstallments: creditSpending * (1.7 + (seed % 7) / 10),
    creditUsage,
    consistency,
    incomeStability,
    goalHealth,
    reserveCoverage,
    launchFrequency,
    categories,
    monthly,
    cards,
  }
}

function statusForScore(score: number): ReportStatus {
  if (score < 40) return 'Crítico'
  if (score < 70) return 'Atenção'
  return 'Excelente'
}

function scoreTone(status: ReportStatus) {
  if (status === 'Crítico') return 'text-red-600'
  if (status === 'Atenção') return 'text-amber-600'
  return 'text-emerald-600'
}

function openWhatsApp(phone?: string | null) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  window.open(digits ? `https://wa.me/55${digits}` : 'https://wa.me/', '_blank', 'noopener,noreferrer')
}

export default function AdvisorClientReportClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const setActingClient = useAdvisorActing((state) => state.setActingClient)
  const [period, setPeriod] = useState<PeriodKey>('6M')
  const [viewMode, setViewMode] = useState<ViewMode>('CONSOLIDATED')
  const [selectedQuestion, setSelectedQuestion] = useState(flyQuestions[0])
  const [selectedClientId, setSelectedClientId] = useState(
    String(searchParams.get('clientId') || searchParams.get('id') || '').trim()
  )

  const clientsQuery = useAdvisorClients({ page: 1, limit: 100 })
  const clients = useMemo(() => clientsQuery.data?.clients ?? [], [clientsQuery.data?.clients])
  const selectedClient = useMemo(() => {
    if (!selectedClientId || clients.length === 0) return null
    return clients.find((client) => client.clientUserId === selectedClientId || client.id === selectedClientId) ?? null
  }, [clients, selectedClientId])

  const report = useMemo(() => {
    if (!selectedClient) return null
    return applyViewMode(buildReportClient(selectedClient, period, locale), viewMode)
  }, [locale, period, selectedClient, viewMode])

  const status = report ? statusForScore(report.healthScore) : 'Atenção'
  const monthly = report?.monthly ?? []
  const periodLabel = periodOptions.find((item) => item.value === period)?.label ?? '6 meses'
  const incomeChange = monthly.length >= 2 ? ((monthly.at(-1)!.income - monthly[0].income) / monthly[0].income) * 100 : 0
  const expenseChange = monthly.length >= 2 ? ((monthly.at(-1)!.expense - monthly[0].expense) / monthly[0].expense) * 100 : 0
  const creditChange = monthly.length >= 2 ? ((monthly.at(-1)!.credit - monthly[0].credit) / monthly[0].credit) * 100 : 0

  function openDashboard(path = '/dashboard') {
    if (!report) return
    setActingClient({
      id: report.clientUserId,
      name: report.name,
      email: report.email,
      permission: report.permission,
    })
    router.push(path)
  }

  async function shareReport() {
    if (!report) return
    const text = `Relatório consultivo de ${report.name} na Flynance Advisor.`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Relatório do Cliente', text, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link do relatório copiado.')
    } catch {
      toast.error('Não foi possível compartilhar agora.')
    }
  }

  const aiSentence =
    status === 'Excelente'
      ? 'O cliente está no caminho certo, com boa consistência e organização financeira positiva.'
      : status === 'Atenção'
        ? 'O cliente apresenta sinais de atenção em crédito, recorrências ou frequência de lançamentos.'
        : 'O comprometimento financeiro está elevado e exige uma intervenção consultiva próxima.'

  /* ── Tela de seleção de cliente ── */
  if (!selectedClientId || !selectedClient) {
    return (
      <AdvisorGuard>
        <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
            <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={() => router.push('/advisor')}
                className="mb-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Advisor
              </button>
              <p className="text-xs font-semibold uppercase text-[#2F6E91]">Relatórios</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#253140]">Selecione um cliente</h1>
              <p className="mt-1 text-sm text-slate-600">
                Escolha um cliente para visualizar o relatório consultivo completo.
              </p>
            </header>

            {clientsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#2F6E91]" />
              </div>
            ) : clients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <UserRound className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-600">Nenhum cliente vinculado ainda.</p>
                <p className="mt-1 text-xs text-slate-400">Gere convites na tela de Clientes para começar.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {clients.map((client) => {
                  const initials = (client.name || 'C')
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  const score = clamp(hashText(client.clientUserId) % 40 + 45, 0, 100)
                  const tone = score >= 70 ? 'emerald' : score >= 50 ? 'amber' : 'rose'
                  const toneClasses = {
                    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    amber: 'bg-amber-50 text-amber-700 border-amber-200',
                    rose: 'bg-rose-50 text-rose-700 border-rose-200',
                  }[tone]
                  const toneLabel = { emerald: 'Saudável', amber: 'Atenção', rose: 'Crítico' }[tone]

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.clientUserId)}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#7CB8D8] hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#EAF4FA] text-sm font-bold text-[#2F6E91]">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#253140]">{client.name}</p>
                        <p className="truncate text-xs text-slate-500">{client.email}</p>
                        <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClasses}`}>
                          {toneLabel}
                        </span>
                      </div>
                      <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </AdvisorGuard>
    )
  }

  return (
    <AdvisorGuard>
      <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pt-8 lg:pb-8">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
            <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => router.push('/advisor')}
                    className="mb-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao Advisor
                  </button>
                  <p className="text-xs font-semibold uppercase text-[#2F6E91]">Visualizando</p>
                  <h1 className="mt-1 text-2xl font-semibold text-[#253140]">
                    Relatório de {report?.name ?? 'cliente'}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    Visão analítica para saúde financeira, comportamento, tendências e recomendações consultivas.
                  </p>
                </div>

                <div className="flex flex-col gap-3 xl:min-w-[560px]">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs font-semibold uppercase text-slate-500">Mudar cliente</span>
                      <select
                        value={selectedClient?.clientUserId ?? selectedClientId}
                        onChange={(event) => {
                          setSelectedClientId(event.target.value)
                          setViewMode('CONSOLIDATED')
                        }}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7CB8D8]"
                      >
                        {clients.map((client) => (
                          <option key={client.id} value={client.clientUserId}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-xs font-semibold uppercase text-slate-500">Período</span>
                      <select
                        value={period}
                        onChange={(event) => setPeriod(event.target.value as PeriodKey)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7CB8D8]"
                      >
                        {periodOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <HeaderAction label="Exportar PDF" Icon={Download} onClick={() => window.print()} />
                    <HeaderAction label="Compartilhar" Icon={Share2} onClick={shareReport} />
                    <HeaderAction label="Abrir Dashboard completo" Icon={LayoutDashboard} onClick={() => openDashboard()} />
                    <HeaderAction label="Abrir WhatsApp" Icon={MessageCircle} onClick={() => openWhatsApp(report?.phone)} />
                  </div>
                </div>
              </div>
            </header>

            {clientsQuery.isLoading ? (
              <LoadingState />
            ) : clientsQuery.isError ? (
              <ErrorState message={clientsQuery.error instanceof Error ? clientsQuery.error.message : 'Não foi possível carregar os clientes.'} />
            ) : !report ? (
              <EmptyState />
            ) : (
              <>
                {report.accountType === 'COUPLE' && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-[#253140]">Conta casal</h2>
                        <p className="mt-1 text-sm text-slate-600">
                          Alterne entre a visão consolidada e a leitura por integrante.
                        </p>
                      </div>
                      <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold text-slate-600">
                        {[
                          ['CONSOLIDATED', 'Consolidado'],
                          ['PERSON_1', report.coupleNames[0]],
                          ['PERSON_2', report.coupleNames[1]],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setViewMode(value as ViewMode)}
                            className={[
                              'rounded-lg px-3 py-2 transition',
                              viewMode === value ? 'bg-white text-[#2F6E91] shadow-sm' : 'hover:bg-white/70',
                            ].join(' ')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <KpiCard title="Receita média mensal" value={formatMoney(report.avgIncome, locale)} detail={`Média de ${periodLabel.toLowerCase()}`} tone="emerald" Icon={TrendingUp} />
                  <KpiCard title="Despesa média mensal" value={formatMoney(report.avgExpense, locale)} detail={`Média de ${periodLabel.toLowerCase()}`} tone="rose" Icon={TrendingDown} />
                  <KpiCard title="Gastos no crédito" value={formatMoney(report.creditSpending, locale)} detail={`${report.activeCards} cartões ativos`} tone="amber" Icon={CreditCard} />
                  <KpiCard title="Taxa de poupança" value={formatPercent(report.savingRate, locale)} detail="Receita menos despesas" tone="emerald" Icon={Target} />
                  <KpiCard title="Endividamento" value={formatPercent(report.debtRatio, locale)} detail="Sobre renda trimestral" tone={report.debtRatio > 55 ? 'rose' : 'slate'} Icon={ShieldAlert} />
                </section>

                <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-[#253140]">Saúde financeira</h2>
                        <p className="mt-1 text-sm text-slate-600">Score consultivo da Fly.</p>
                      </div>
                      <span className={['rounded-full border px-3 py-1 text-xs font-semibold', status === 'Excelente' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'Atenção' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'].join(' ')}>
                        {status}
                      </span>
                    </div>

                    <ScoreGauge score={report.healthScore} status={status} />
                    <div className="mt-4 rounded-2xl border border-[#D7EAF5] bg-[#F3FAFF] p-4 text-sm leading-6 text-slate-700">
                      {aiSentence}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-[#253140]">Critérios do score</h2>
                        <p className="mt-1 text-sm text-slate-600">Leitura ponderada de comportamento, crédito e evolução.</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-[#2F6E91]" />
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ScoreCriterion label="Consistência financeira" value={report.consistency} />
                      <ScoreCriterion label="Gastos vs. receita" value={clamp(100 - (report.avgExpense / Math.max(1, report.avgIncome)) * 100, 0, 100)} />
                      <ScoreCriterion label="Saldo mensal" value={clamp(55 + report.savingRate, 0, 100)} />
                      <ScoreCriterion label="Reserva financeira" value={report.reserveCoverage} />
                      <ScoreCriterion label="Uso do crédito" value={clamp(100 - report.creditUsage, 0, 100)} />
                      <ScoreCriterion label="Frequência de lançamentos" value={report.launchFrequency} />
                      <ScoreCriterion label="Saúde das metas" value={report.goalHealth} />
                      <ScoreCriterion label="Estabilidade de renda" value={report.incomeStability} />
                    </div>
                  </article>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <SectionCard title="Tendências financeiras" description="Sinais rápidos para leitura em cinco segundos." Icon={BarChart3}>
                    <div className="grid gap-3 md:grid-cols-3">
                      <TrendCard title="Receita" value={`${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(0)}%`} detail="evolução no período" tone={incomeChange >= 0 ? 'emerald' : 'amber'} data={monthly.map((item) => item.income)} />
                      <TrendCard title="Despesas" value={`${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(0)}%`} detail="variação de gastos" tone={expenseChange > 18 ? 'rose' : 'amber'} data={monthly.map((item) => item.expense)} />
                      <TrendCard title="Crédito" value={`${creditChange >= 0 ? '+' : ''}${creditChange.toFixed(0)}%`} detail="uso do cartão" tone={creditChange > 25 ? 'rose' : 'slate'} data={monthly.map((item) => item.credit)} />
                    </div>
                  </SectionCard>

                  <SectionCard title="Insights da Fly" description="Leitura automática de comportamento financeiro." Icon={Sparkles}>
                    <div className="space-y-3">
                      <InsightCard tone="emerald" text={`Cliente está gastando ${Math.max(0, 100 - Math.round((report.avgExpense / report.avgIncome) * 100))}% menos do que ganha.`} />
                      <InsightCard tone="amber" text={`Gastos com alimentação representam ${report.categories.find((item) => item.label === 'Alimentação')?.percentage ?? 18}% das despesas.`} />
                      <InsightCard tone={creditChange > 25 ? 'rose' : 'sky'} text={`Uso do cartão cresceu ${creditChange.toFixed(0)}% no período.`} />
                      <InsightCard tone="slate" text={`Parcelamentos futuros comprometem ${formatPercent((report.futureInstallments / Math.max(1, report.avgIncome * 3)) * 100, locale)} da renda trimestral.`} />
                    </div>
                  </SectionCard>
                </section>

                <section>
                  <SectionCard title="Para onde o dinheiro está indo?" description="Distribuição dos gastos por categoria." Icon={PieChart}>
                    <div className="mb-4 inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
                      <button type="button" className="rounded-lg bg-white px-3 py-1.5 text-[#2F6E91] shadow-sm">Mês atual</button>
                      <button type="button" className="rounded-lg px-3 py-1.5 hover:bg-white/70">3 meses</button>
                      <button type="button" className="rounded-lg px-3 py-1.5 hover:bg-white/70">12 meses</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {report.categories.map((item) => (
                        <CategoryTile key={item.label} item={item} locale={locale} />
                      ))}
                    </div>
                  </SectionCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                  <SectionCard title="Resumo do crédito" description="Cartões, faturas e parcelas futuras." Icon={CreditCard}>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <MiniMetric label="Cartões ativos" value={String(report.activeCards)} tone="sky" />
                      <MiniMetric label="Crédito total" value={formatMoney(report.creditSpending, locale)} tone="amber" />
                      <MiniMetric label="Parcelas futuras" value={formatMoney(report.futureInstallments, locale)} tone="rose" />
                      <MiniMetric label="Utilização média" value={formatPercent(report.creditUsage, locale)} tone="slate" />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {report.cards.map((card) => (
                        <article key={card.name} className={['rounded-2xl border p-4', card.tone].join(' ')}>
                          <p className="text-sm font-semibold">{card.name}</p>
                          <p className="mt-2 text-xl font-semibold">{formatMoney(card.amount, locale)}</p>
                          <p className="mt-2 text-xs">Fecha em {card.closesAt}</p>
                          <p className="text-xs">Vence em {card.dueAt}</p>
                        </article>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="Pontos de atenção" description="Alertas priorizados para atuação consultiva." Icon={AlertTriangle}>
                    <div className="space-y-3">
                      <AlertCard tone={creditChange > 20 ? 'rose' : 'amber'} title="Uso do crédito" detail={creditChange > 20 ? 'Cliente aumentou uso do crédito acima do esperado.' : 'Uso do crédito está sob acompanhamento.'} />
                      <AlertCard tone={report.futureInstallments / report.avgIncome > 0.7 ? 'rose' : 'amber'} title="Parcelamentos" detail="Parcelamentos futuros exigem revisão de calendário financeiro." />
                      <AlertCard tone={report.reserveCoverage < 65 ? 'rose' : 'sky'} title="Reserva" detail={report.reserveCoverage < 65 ? 'Reserva abaixo do ideal para o padrão de gastos.' : 'Reserva em nível aceitável para o período.'} />
                      <AlertCard tone={report.launchFrequency < 55 ? 'rose' : 'slate'} title="Lançamentos" detail={report.launchFrequency < 55 ? 'Cliente precisa retomar frequência de registros.' : 'Frequência de uso está consistente.'} />
                    </div>
                  </SectionCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
                  <SectionCard title="Peça insights à Fly" description="Perguntas rápidas para apoiar a próxima conversa." Icon={Bot}>
                    <div className="flex flex-wrap gap-2">
                      {flyQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => setSelectedQuestion(question)}
                          className={[
                            'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                            selectedQuestion === question
                              ? 'border-[#4F98C2] bg-[#EAF4FA] text-[#2F6E91]'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          {question}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#EAF4FA] text-[#2F6E91]">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#253140]">Fly</p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {buildFlyAnswer(selectedQuestion, report, locale)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                      <input
                        value={`Fly, ${selectedQuestion.toLowerCase()}.`}
                        readOnly
                        className="h-10 min-w-0 flex-1 rounded-xl bg-slate-50 px-3 text-sm text-slate-600 outline-none"
                      />
                      <button type="button" className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title="Ações rápidas" description="Atalhos para continuar o atendimento." Icon={Activity}>
                    <div className="grid gap-2">
                      <QuickAction label="Gerar relatório PDF" Icon={FileText} onClick={() => window.print()} />
                      <QuickAction label="Compartilhar com cliente" Icon={Share2} onClick={shareReport} />
                      <QuickAction label="Criar meta" Icon={Target} onClick={() => openDashboard('/dashboard/metas')} />
                      <QuickAction label="Criar planejamento" Icon={CalendarDays} onClick={() => openDashboard('/dashboard/futuros')} />
                      <QuickAction label="Abrir WhatsApp" Icon={MessageCircle} onClick={() => openWhatsApp(report.phone)} />
                      <QuickAction label="Abrir Dashboard" Icon={LayoutDashboard} onClick={() => openDashboard()} />
                      <QuickAction label="Agendar reunião" Icon={CalendarDays} onClick={() => toast.success('A agenda será conectada ao módulo Advisor.')} />
                    </div>
                  </SectionCard>
                </section>
              </>
            )}
          </div>
      </section>
      <Toaster />
    </AdvisorGuard>
  )
}

function HeaderAction({ label, Icon, onClick }: { label: string; Icon: typeof Download; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function KpiCard({
  title,
  value,
  detail,
  tone,
  Icon,
}: {
  title: string
  value: string
  detail: string
  tone: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate'
  Icon: typeof TrendingUp
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-700 bg-emerald-50'
      : tone === 'rose'
        ? 'text-rose-700 bg-rose-50'
        : tone === 'sky'
          ? 'text-sky-700 bg-sky-50'
          : tone === 'amber'
            ? 'text-amber-700 bg-amber-50'
            : 'text-slate-700 bg-slate-50'

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B7D7E8]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
        <div className={['grid h-9 w-9 place-items-center rounded-xl', color].join(' ')}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#253140]">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  )
}

function ScoreGauge({ score, status }: { score: number; status: ReportStatus }) {
  return (
    <div className="mt-5 flex flex-col items-center">
      <svg viewBox="0 0 220 132" className="h-40 w-full max-w-[300px]">
        <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="#E5EAF0" strokeWidth="18" strokeLinecap="round" pathLength={100} />
        <path
          d="M 30 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke={status === 'Excelente' ? '#10B981' : status === 'Atenção' ? '#F59E0B' : '#EF4444'}
          strokeWidth="18"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${score} 100`}
        />
        <text x="110" y="92" textAnchor="middle" className="fill-[#253140] text-4xl font-semibold">
          {score}
        </text>
        <text x="110" y="116" textAnchor="middle" className={`text-sm font-semibold ${scoreTone(status).replace('text-', 'fill-')}`}>
          {status}
        </text>
      </svg>
    </div>
  )
}

function ScoreCriterion({ label, value }: { label: string; value: number }) {
  const tone = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-semibold text-[#253140]">{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white">
        <div className={['h-2 rounded-full', tone].join(' ')} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function SectionCard({ title, description, Icon, children }: { title: string; description: string; Icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#253140]">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#F0F7FB] text-[#2F6E91]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </section>
  )
}

function MiniLine({ data, tone }: { data: number[]; tone: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate' }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const color = tone === 'emerald' ? '#10B981' : tone === 'rose' ? '#F43F5E' : tone === 'sky' ? '#0EA5E9' : tone === 'amber' ? '#F59E0B' : '#64748B'
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(1, data.length - 1)) * 140
      const y = 46 - ((value - min) / Math.max(1, max - min)) * 38
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 140 54" className="h-14 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrendCard({ title, value, detail, tone, data }: { title: string; value: string; detail: string; tone: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate'; data: number[] }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#253140]">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <p className={['text-lg font-semibold', tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : tone === 'sky' ? 'text-sky-700' : 'text-slate-700'].join(' ')}>
          {value}
        </p>
      </div>
      <div className="mt-3">
        <MiniLine data={data} tone={tone} />
      </div>
    </article>
  )
}

function InsightCard({ text, tone }: { text: string; tone: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate' }) {
  const iconClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'rose'
        ? 'bg-rose-100 text-rose-700'
        : tone === 'sky'
          ? 'bg-sky-100 text-sky-700'
          : tone === 'amber'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-200 text-slate-700'

  return (
    <article className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className={['grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl', iconClass].join(' ')}>
        <Sparkles className="h-4 w-4" />
      </div>
      <p className="text-sm leading-6 text-slate-700">{text}</p>
    </article>
  )
}

function CategoryTile({ item, locale }: { item: ReportClient['categories'][number]; locale: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={['h-3 w-3 rounded-full', item.tone].join(' ')} />
          <p className="text-sm font-semibold text-[#253140]">{item.label}</p>
        </div>
        <p className="text-xs font-semibold text-slate-500">{item.percentage}%</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-[#253140]">{formatMoney(item.amount, locale)}</p>
      <div className="mt-2 h-2 rounded-full bg-white">
        <div className={['h-2 rounded-full', item.tone].join(' ')} style={{ width: `${item.percentage}%` }} />
      </div>
    </article>
  )
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'sky' | 'amber' | 'slate' }) {
  const valueClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : tone === 'sky' ? 'text-sky-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-700'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={['mt-2 text-sm font-semibold', valueClass].join(' ')}>{value}</p>
    </div>
  )
}

function AlertCard({ title, detail, tone }: { title: string; detail: string; tone: 'rose' | 'amber' | 'sky' | 'slate' }) {
  const className =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'sky'
          ? 'border-sky-200 bg-sky-50 text-sky-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <article className={['rounded-2xl border p-4', className].join(' ')}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-5 opacity-90">{detail}</p>
        </div>
      </div>
    </article>
  )
}

function QuickAction({ label, Icon, onClick }: { label: string; Icon: typeof FileText; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2F6E91]" />
        {label}
      </span>
      <ArrowUpRight className="h-4 w-4 text-slate-400" />
    </button>
  )
}

function buildFlyAnswer(question: string, report: ReportClient, locale: string) {
  if (question.includes('Categorias')) {
    const top = [...report.categories].sort((left, right) => right.amount - left.amount).slice(0, 3)
    return `As categorias que mais pressionam o orçamento são ${top.map((item) => item.label).join(', ')}. A maior oportunidade está em revisar recorrências e limites de ${top[0]?.label.toLowerCase()}.`
  }

  if (question.includes('Riscos')) {
    return `Os principais riscos são uso de crédito em ${formatPercent(report.creditUsage, locale)}, parcelamentos futuros de ${formatMoney(report.futureInstallments, locale)} e reserva financeira em ${report.reserveCoverage}%.`
  }

  if (question.includes('ajudar')) {
    return `Comece por uma conversa objetiva sobre crédito e reserva. Sugira limite por categoria, revisão de faturas e uma meta de poupança mensal de aproximadamente ${formatMoney(Math.max(300, report.avgIncome * 0.08), locale)}.`
  }

  return `O cliente mantém receita média de ${formatMoney(report.avgIncome, locale)}, despesas de ${formatMoney(report.avgExpense, locale)} e score ${report.healthScore}. A tendência geral é ${report.healthScore >= 70 ? 'positiva, com bom espaço para planejamento financeiro' : 'de atenção, com foco em reduzir pressão de crédito e melhorar consistência'}.`
}

function LoadingState() {
  return (
    <div className="grid gap-5">
      <div className="h-28 animate-pulse rounded-2xl bg-white" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-44 animate-pulse rounded-2xl bg-white" />
        <div className="h-44 animate-pulse rounded-2xl bg-white" />
        <div className="h-44 animate-pulse rounded-2xl bg-white" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      {message}
    </section>
  )
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <UserRound className="mx-auto h-10 w-10 text-slate-400" />
      <h2 className="mt-3 text-base font-semibold text-[#253140]">Nenhum cliente conectado</h2>
      <p className="mt-1 text-sm text-slate-600">
        O relatório consultivo ficará disponível quando houver clientes ativos no Advisor.
      </p>
    </section>
  )
}

