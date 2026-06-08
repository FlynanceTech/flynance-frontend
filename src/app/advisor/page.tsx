'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react'

import AdvisorGuard from './components/AdvisorGuard'
import AdvisorInviteGenerationSection from './components/AdvisorInviteGenerationSection'
import {
  useAdvisorClients,
  useAdvisorGeneratedInvites,
  useRevokeAdvisorClientLink,
} from '@/hooks/query/useAdvisor'
import type { AdvisorClient, AdvisorPermission } from '@/services/advisor'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useUserSession } from '@/stores/useUserSession'
import { formatCurrency as formatCurrencyByPreference } from '@/utils/formatter'
import { isOrgAdminRole } from '@/utils/roles'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AdvisorClientOptionalFields = AdvisorClient & {
  accountType?: string | null
  clientName2?: string | null
  creditSpending?: number | null
  whatsapp?: string | null
}

type ClientFilter =
  | 'ALL'
  | 'INDIVIDUAL'
  | 'COUPLE'
  | 'OVERDUE'
  | 'INACTIVE'
  | 'CRITICAL'

type EnrichedClient = AdvisorClient & {
  accountType: 'INDIVIDUAL' | 'COUPLE'
  healthScore: number
  creditSpending: number
  debtRatio: number
  consistency: number
  usageFrequency: number
  financialEvolution: number
  lastActivityDays: number
  lastActivityLabel: string
  riskStatus: 'Saudável' | 'Atenção' | 'Crítico'
  coupleNames: string[]
  categoryMix: Array<{ label: string; value: number; color: string }>
  trend: number[]
}

type AdvisorAlertTone = 'red' | 'amber' | 'slate'

type AdvisorAlert = {
  client: EnrichedClient
  title: string
  impact: string
  tone: AdvisorAlertTone
}

type AdvisorAlertGroup = {
  client: EnrichedClient
  alerts: AdvisorAlert[]
}

type AdvisorInsightItem = {
  id: string
  text: string
  clients: EnrichedClient[]
  insightLabel: string
}

type MockConsultor = {
  id: string
  name: string
  email: string
  activeClients: number
  pendingInvites: number
  criticalClients: number
  status: 'active' | 'pending' | 'inactive'
}

const filterLabels: Record<ClientFilter, string> = {
  ALL: 'Todos',
  INDIVIDUAL: 'Individuais',
  COUPLE: 'Casal',
  OVERDUE: 'Inadimplentes',
  INACTIVE: 'Sem movimentação',
  CRITICAL: 'Críticos',
}

const MOCK_CONSULTORES: MockConsultor[] = [
  { id: 'c1', name: 'Rafael Mendes', email: 'rafael@flynadvisory.com', activeClients: 12, pendingInvites: 2, criticalClients: 1, status: 'active' },
  { id: 'c2', name: 'Camila Torres', email: 'camila@flynadvisory.com', activeClients: 8, pendingInvites: 0, criticalClients: 0, status: 'active' },
  { id: 'c3', name: 'Lucas Ferreira', email: 'lucas@flynadvisory.com', activeClients: 5, pendingInvites: 1, criticalClients: 2, status: 'active' },
  { id: 'c4', name: 'Beatriz Lima', email: 'beatriz@flynadvisory.com', activeClients: 0, pendingInvites: 0, criticalClients: 0, status: 'pending' },
]

function SortableClientCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50 z-50 relative' : 'relative'}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        aria-label="Reordenar cliente"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="pl-7">{children}</div>
    </div>
  )
}

function hashText(value: string) {
  return Array.from(value || 'client').reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function formatCurrency(value?: number | null) {
  return formatCurrencyByPreference(Number(value ?? 0))
}

function permissionLabel(value: AdvisorPermission) {
  return value === 'READ_ONLY' ? 'Somente leitura' : 'Leitura e escrita'
}

function isCoupleClient(client: AdvisorClientOptionalFields) {
  const rawType = String(client.accountType ?? '').toUpperCase()
  if (rawType === 'COUPLE' || rawType === 'CASAL') return true
  if (client.clientName2) return true
  return /\s(&|e|\+|\/)\s/i.test(client.name)
}

function toCoupleNames(client: AdvisorClientOptionalFields) {
  if (client.clientName2) return [client.name, client.clientName2].filter(Boolean)
  const pieces = client.name.split(/\s(?:&|e|\+|\/)\s/i).map((item) => item.trim()).filter(Boolean)
  return pieces.length >= 2 ? pieces.slice(0, 2) : [client.name, 'Parceiro(a)']
}

function daysSince(value?: string | null, fallback = 0) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
}

function lastActivityLabel(days: number) {
  if (days <= 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  if (days < 7) return `há ${days} dias`
  if (days < 30) return `há ${Math.round(days / 7)} semanas`
  return `há ${Math.round(days / 30)} meses`
}

function scoreStatus(score: number): EnrichedClient['riskStatus'] {
  if (score <= 39) return 'Crítico'
  if (score <= 69) return 'Atenção'
  return 'Saudável'
}

function scoreClass(score: number) {
  if (score <= 39) return 'bg-red-500'
  if (score <= 69) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function statusBadgeClass(status: EnrichedClient['riskStatus']) {
  if (status === 'Crítico') return 'border-red-200 bg-red-50 text-red-700'
  if (status === 'Atenção') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function enrichClient(client: AdvisorClient): EnrichedClient {
  const raw = client as AdvisorClientOptionalFields
  const seed = hashText(client.id || client.name)
  const accountType = isCoupleClient(raw) ? 'COUPLE' : 'INDIVIDUAL'
  const lastActivityDays = daysSince(client.latestActivityAt, seed % 18)
  const income = Number(client.income || 0)
  const expense = Number(client.expense || 0)
  const balance = Number(client.balance || income - expense || 0)
  const creditSpending = Number(raw.creditSpending ?? Math.max(0, expense * (0.22 + (seed % 28) / 100)))
  const expenseRatio = income > 0 ? expense / income : 0.78
  const debtRatio = clamp((creditSpending / Math.max(income, 1)) * 100, 0, 140)
  const activityPenalty = lastActivityDays > 14 ? 18 : lastActivityDays > 7 ? 10 : 0
  const baseScore =
    typeof client.score === 'number'
      ? client.score
      : 88 - expenseRatio * 34 - debtRatio * 0.18 - activityPenalty + (balance >= 0 ? 6 : -12)
  const healthScore = clamp(baseScore, 18, 97)
  const trendSeed = seed % 9

  return {
    ...client,
    accountType,
    healthScore,
    creditSpending,
    debtRatio,
    consistency: clamp(healthScore - (lastActivityDays > 7 ? 10 : 0) + 8, 0, 100),
    usageFrequency: clamp(100 - lastActivityDays * 5, 0, 100),
    financialEvolution: clamp(50 + (balance >= 0 ? 18 : -16) + trendSeed * 3, 0, 100),
    lastActivityDays,
    lastActivityLabel: lastActivityLabel(lastActivityDays),
    riskStatus: scoreStatus(healthScore),
    coupleNames: accountType === 'COUPLE' ? toCoupleNames(raw) : [client.name],
    categoryMix: [
      { label: 'Moradia', value: clamp(24 + (seed % 18), 12, 52), color: 'bg-[#4F98C2]' },
      { label: 'Alimentação', value: clamp(18 + (seed % 16), 10, 44), color: 'bg-[#78B7A0]' },
      { label: 'Cartão de Crédito', value: clamp(12 + (seed % 22), 8, 48), color: 'bg-[#E7B75F]' },
    ],
    trend: Array.from({ length: 7 }, (_, index) =>
      clamp(42 + trendSeed * 4 + index * 5 + (index % 2 === 0 ? 8 : -4), 20, 96)
    ),
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'CL'
}

function openWhatsApp(phone?: string | null) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  window.open(digits ? `https://wa.me/55${digits}` : 'https://wa.me/', '_blank', 'noopener,noreferrer')
}

function currentPeriodLabel() {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
    .format(new Date())
    .replace(/^\w/, (c) => c.toUpperCase())
}

function AdvisorPageInner() {
  const router = useRouter()
  const [clientsPage, setClientsPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('ALL')
  const [alertsOpen, setAlertsOpen] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(true)
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false)
  const [selectedAlertGroup, setSelectedAlertGroup] = useState<AdvisorAlertGroup | null>(null)
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<AdvisorInsightItem | null>(null)
  const [consultorFilter, setConsultorFilter] = useState<string>('all')
  const [addConsultorOpen, setAddConsultorOpen] = useState(false)

  const session = useUserSession((state) => state.user)
  const setActingClient = useAdvisorActing((s) => s.setActingClient)
  const clientsQuery = useAdvisorClients({ page: clientsPage, limit: 50 })
  const invitesQuery = useAdvisorGeneratedInvites()
  const revokeClientMutation = useRevokeAdvisorClientLink()

  const advisorName = session?.userData?.user?.name?.split(' ')?.[0] || 'Advisor'
  const userRole = session?.userData?.user?.role ?? ''
  const isMaster = isOrgAdminRole(userRole)

  const clients = useMemo(() => clientsQuery.data?.clients ?? [], [clientsQuery.data?.clients])
  const clientsMeta = clientsQuery.data?.meta
  const enrichedClients = useMemo(() => clients.map(enrichClient), [clients])
  const [clientOrder, setClientOrder] = useState<string[]>([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const invites = invitesQuery.data ?? []
  const pendingInvites = invites.filter((invite) => invite.status === 'PENDING').length

  const filteredAndSortedClients = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = enrichedClients.filter((client) => {
      const matchesSearch =
        !term ||
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term)
      if (!matchesSearch) return false
      if (filter === 'INDIVIDUAL') return client.accountType === 'INDIVIDUAL'
      if (filter === 'COUPLE') return client.accountType === 'COUPLE'
      if (filter === 'OVERDUE') return client.debtRatio >= 75 || client.balance < 0
      if (filter === 'INACTIVE') return client.lastActivityDays >= 10
      if (filter === 'CRITICAL') return client.healthScore <= 39
      return true
    })
    if (clientOrder.length === 0) return filtered
    const posMap = new Map(clientOrder.map((id, i) => [id, i]))
    return [...filtered].sort((a, b) => {
      const ia = posMap.get(a.clientUserId) ?? 999
      const ib = posMap.get(b.clientUserId) ?? 999
      return ia - ib
    })
  }, [enrichedClients, filter, search, clientOrder])

  const filteredClients = filteredAndSortedClients

  const handleClientDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setClientOrder((prev) => {
      const ids = prev.length > 0 ? prev : filteredClients.map((c) => c.clientUserId)
      const oldIndex = ids.indexOf(String(active.id))
      const newIndex = ids.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(ids, oldIndex, newIndex)
    })
  }, [filteredClients])

  const activeClients = clientsMeta?.total ?? enrichedClients.length
  const criticalClients = enrichedClients.filter((client) => client.healthScore <= 39).length
  const inactiveClients = enrichedClients.filter((client) => client.lastActivityDays >= 10).length

  const kpis = [
    { label: 'Clientes ativos', value: activeClients, detail: '+3 este mês', Icon: UsersRound },
    { label: 'Convites pendentes', value: pendingInvites, detail: 'uso único, 3 dias', Icon: ClipboardList },
    {
      label: 'Clientes críticos',
      value: criticalClients,
      detail: `${inactiveClients} sem movimentação`,
      Icon: ShieldAlert,
    },
  ]

  const alerts = useMemo<AdvisorAlert[]>(() => {
    const items = enrichedClients
      .flatMap((client) => {
        const clientAlerts: AdvisorAlert[] = []
        if (client.healthScore <= 39) {
          clientAlerts.push({
            client,
            title: 'Saúde financeira crítica',
            impact: 'Risco alto de desorganização no mês',
            tone: 'red' as const,
          })
        }
        if (client.debtRatio >= 75) {
          clientAlerts.push({
            client,
            title: `Uso de cartão de crédito em ${client.debtRatio}% da renda`,
            impact: 'Revisar faturas e recorrências',
            tone: 'amber' as const,
          })
        }
        if (client.lastActivityDays >= 10) {
          clientAlerts.push({
            client,
            title: `${client.lastActivityDays} dias sem movimentações`,
            impact: 'Baixa frequência de uso',
            tone: 'slate' as const,
          })
        }
        if (client.balance < 0) {
          clientAlerts.push({
            client,
            title: 'Despesas acima das receitas',
            impact: 'Saldo mensal negativo',
            tone: 'red' as const,
          })
        }
        return clientAlerts
      })
      .sort((left, right) => right.client.debtRatio + (100 - right.client.healthScore) - (left.client.debtRatio + (100 - left.client.healthScore)))

    return items.slice(0, 5)
  }, [enrichedClients])

  const alertGroups = useMemo<AdvisorAlertGroup[]>(() => {
    const grouped = new Map<string, AdvisorAlertGroup>()

    alerts.forEach((alert) => {
      const current = grouped.get(alert.client.id)
      if (current) {
        current.alerts.push(alert)
        return
      }

      grouped.set(alert.client.id, {
        client: alert.client,
        alerts: [alert],
      })
    })

    return Array.from(grouped.values()).sort((left, right) => {
      const leftRisk = 100 - left.client.healthScore + left.client.debtRatio + left.alerts.length * 8
      const rightRisk = 100 - right.client.healthScore + right.client.debtRatio + right.alerts.length * 8
      return rightRisk - leftRisk
    })
  }, [alerts])

  const insights = useMemo<AdvisorInsightItem[]>(() => {
    const creditClients = enrichedClients.filter((c) => c.debtRatio >= 40)
    const inactiveList = enrichedClients.filter((c) => c.lastActivityDays >= 10)
    const coupleClients = enrichedClients.filter((c) => c.accountType === 'COUPLE')
    const highExpenseClients = enrichedClients.filter((c) => c.debtRatio >= 30)

    return [
      {
        id: 'credit',
        text: `${criticalClients} cliente${criticalClients !== 1 ? 's' : ''} pode${criticalClients !== 1 ? 'm' : ''} se beneficiar de reorganização de cartão de crédito.`,
        clients: creditClients,
        insightLabel: 'Alto uso de cartão de crédito',
      },
      {
        id: 'inactive',
        text: `${inactiveClients} cliente${inactiveClients !== 1 ? 's' : ''} está${inactiveClients !== 1 ? 'o' : ''} com baixa frequência de lançamentos.`,
        clients: inactiveList,
        insightLabel: 'Baixa frequência de lançamentos',
      },
      {
        id: 'couple',
        text: 'Clientes casal tendem a apresentar maior retenção quando revisados quinzenalmente.',
        clients: coupleClients,
        insightLabel: 'Revisão quinzenal recomendada',
      },
      {
        id: 'expenses',
        text: 'Alimentação e recorrências aparecem como principais pontos de ajuste da carteira.',
        clients: highExpenseClients,
        insightLabel: 'Gastos relevantes em alimentação',
      },
    ]
  }, [enrichedClients, criticalClients, inactiveClients])

  const clientsTotalPages = useMemo(() => {
    if (!clientsMeta) return 1
    return Math.max(1, clientsMeta.totalPages || Math.ceil(clientsMeta.total / Math.max(1, clientsMeta.limit)))
  }, [clientsMeta])

  function openClientDashboard(client: EnrichedClient, path = '/dashboard') {
    setActingClient({
      id: client.clientUserId,
      name: client.name,
      email: client.email,
      permission: client.permission,
    })
    router.push(path)
  }

  return (
    <AdvisorGuard>
      <section className="w-full px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pt-8 lg:pb-8">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
            <header
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              data-onboarding-target="advisor-header"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#2F6E91]">Flynance Advisor</p>
                  <h1 className="mt-1 text-2xl font-semibold text-[#253140]">Olá, {advisorName}</h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Você acompanha {activeClients} clientes ativos em tempo real.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isMaster && (
                    <select
                      value={consultorFilter}
                      onChange={(e) => setConsultorFilter(e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#7CB8D8]"
                      aria-label="Visualizando consultor"
                    >
                      <option value="all">Todos os consultores</option>
                      {MOCK_CONSULTORES.filter((c) => c.status === 'active').map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => setInviteDrawerOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
                  >
                    <Plus className="h-4 w-4" />
                    Gerar convites
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative block flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar cliente, casal, e-mail ou telefone"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-[#7CB8D8] focus:bg-white"
                  />
                </label>

                <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
                  {(Object.keys(filterLabels) as ClientFilter[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={[
                        'h-10 flex-shrink-0 rounded-xl border px-3 text-xs font-semibold transition',
                        filter === item
                          ? 'border-[#4F98C2] bg-[#EAF4FA] text-[#2F6E91]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {filterLabels[item]}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* KPIs */}
            <section className="grid gap-3 md:grid-cols-3">
              {kpis.map(({ label, value, detail, Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#B7D7E8]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-[#253140]">{value}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FB] text-[#2F6E91]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">{detail}</p>
                </button>
              ))}
            </section>

            <div className="space-y-5">
              {/* Alertas */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAlertsOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={alertsOpen}
                >
                  <span>
                    <span className="block text-base font-semibold text-[#253140]">
                      Clientes que precisam da sua atenção
                    </span>
                    <span className="mt-1 block text-sm font-normal text-slate-600">
                      Alertas priorizados por urgência, uso e risco financeiro.
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {alerts.length} alertas ativos
                    </span>
                    <ChevronDown
                      className={[
                        'h-5 w-5 flex-shrink-0 text-slate-500 transition-transform',
                        alertsOpen ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </span>
                </button>

                {alertsOpen && (
                  alertGroups.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                      Nenhum cliente em estado crítico no momento.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {alertGroups.map((group) => {
                        const mainAlert = group.alerts[0]
                        const hasMultipleAlerts = group.alerts.length > 1
                        return (
                        <article
                          key={group.client.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-[#B7D7E8] hover:bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedAlertGroup(group)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-3">
                              <div className={[
                                'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                                mainAlert?.tone === 'red'
                                  ? 'bg-red-100 text-red-600'
                                  : mainAlert?.tone === 'amber'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-200 text-slate-600',
                              ].join(' ')}>
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-[#253140]">{group.client.name}</p>
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                    {group.alerts.length} alerta{group.alerts.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                  {hasMultipleAlerts
                                    ? `${group.alerts.length} pontos precisam de atenção`
                                    : mainAlert?.title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {hasMultipleAlerts
                                    ? mainAlert?.title
                                    : mainAlert?.impact}
                                </p>
                              </div>
                            </div>
                          </button>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => openClientDashboard(group.client)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Abrir Dashboard
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </article>
                        )
                      })}
                    </div>
                  )
                )}
              </section>

              {/* Insights da Fly */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setInsightsOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={insightsOpen}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#2F6E91]" />
                    <span>
                      <span className="block text-base font-semibold text-[#253140]">Insights da Fly</span>
                      <span className="mt-1 block text-sm font-normal text-slate-600">
                        Leituras automáticas sobre carteira, uso e oportunidades de ação.
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={[
                      'h-5 w-5 flex-shrink-0 text-slate-500 transition-transform',
                      insightsOpen ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </button>

                {insightsOpen && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {insights.map((insight) => (
                        <button
                          key={insight.id}
                          type="button"
                          onClick={() => setSelectedInsight(insight)}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left text-sm leading-5 text-slate-700 transition hover:border-[#B7D7E8] hover:bg-white"
                        >
                          {insight.text}
                          {insight.clients.length > 0 && (
                            <span className="mt-2 block text-[11px] font-semibold text-[#2F6E91]">
                              {insight.clients.length} cliente{insight.clients.length !== 1 ? 's' : ''} — clique para ver
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => router.push('/advisor/relatorio-cliente')}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#4F98C2] bg-white px-4 text-sm font-semibold text-[#2F6E91] hover:bg-[#EAF4FA]"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Ir para Relatórios
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Carteira de Clientes */}
              <section
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                data-onboarding-target="advisor-clients"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#253140]">Carteira de clientes</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Resumo financeiro, saúde, atividade e atalhos de atendimento.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Período: {currentPeriodLabel()}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {filteredClients.length} de {enrichedClients.length} exibidos
                    </span>
                  </div>
                </div>

                {clientsQuery.isLoading ? (
                  <div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-100" />
                ) : clientsQuery.isError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {clientsQuery.error instanceof Error
                      ? clientsQuery.error.message
                      : 'Erro ao carregar clientes.'}
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
                    Nenhum cliente encontrado para os filtros atuais.
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleClientDragEnd}>
                    <SortableContext items={filteredClients.map((c) => c.clientUserId)} strategy={verticalListSortingStrategy}>
                      <div className="mt-4 space-y-3">
                        {filteredClients.map((client) => (
                          <SortableClientCard key={client.clientUserId} id={client.clientUserId}>
                          <article
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.1fr)_1.3fr_260px] xl:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            {client.accountType === 'COUPLE' ? (
                              <div className="relative h-11 w-14 flex-shrink-0">
                                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                                  {initials(client.coupleNames[0])}
                                </div>
                                <div className="absolute right-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#4F98C2] text-xs font-semibold text-white">
                                  {initials(client.coupleNames[1])}
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#253140] text-sm font-semibold text-white">
                                {initials(client.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-[#253140]">{client.name}</h3>
                                <span className="rounded-full border border-[#D7EAF5] bg-[#F3FAFF] px-2 py-0.5 text-[11px] font-semibold text-[#2F6E91]">
                                  {client.accountType === 'COUPLE' ? 'Casal' : 'Individual'}
                                </span>
                                <span className={['rounded-full border px-2 py-0.5 text-[11px] font-semibold', statusBadgeClass(client.riskStatus)].join(' ')}>
                                  {client.riskStatus}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-slate-500">{client.email || 'E-mail não informado'}</p>
                              <p className="mt-1 text-xs text-slate-500">Última atividade: {client.lastActivityLabel}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Metric label="Receitas" value={formatCurrency(client.income)} tone="emerald" />
                            <Metric label="Despesas" value={formatCurrency(client.expense)} tone="red" />
                            <Metric label="Saldo" value={formatCurrency(client.balance)} />
                            <Metric label="Cartão de Crédito" value={formatCurrency(client.creditSpending)} tone="amber" />
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">Saúde financeira</p>
                                <p className="mt-1 text-xl font-semibold text-[#253140]">{client.healthScore}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedClient(client)}
                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Visualização rápida
                              </button>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-100">
                              <div
                                className={['h-2 rounded-full', scoreClass(client.healthScore)].join(' ')}
                                style={{ width: `${client.healthScore}%` }}
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                              <span>Dívida {client.debtRatio}%</span>
                              <span>Uso {client.usageFrequency}%</span>
                              <span>Evol. {client.financialEvolution}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap gap-2">
                            {client.accountType === 'COUPLE' && (
                              <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                                <button type="button" className="bg-[#EAF4FA] px-3 py-1.5 text-[#2F6E91]">Consolidado</button>
                                <button type="button" className="px-3 py-1.5 hover:bg-slate-50">{client.coupleNames[0]}</button>
                                <button type="button" className="px-3 py-1.5 hover:bg-slate-50">{client.coupleNames[1]}</button>
                              </div>
                            )}
                            <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                              {permissionLabel(client.permission)}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <ClientAction label="Abrir Dashboard" Icon={LayoutDashboard} onClick={() => openClientDashboard(client)} />
                            <ClientAction
                              label="Relatórios"
                              Icon={FileText}
                              onClick={() =>
                                openClientDashboard(
                                  client,
                                  `/advisor/relatorio-cliente?clientId=${encodeURIComponent(client.clientUserId)}`
                                )
                              }
                            />
                            <button
                              type="button"
                              onClick={() => router.push(`/advisor/planejamento/${encodeURIComponent(client.clientUserId)}?name=${encodeURIComponent(client.name)}`)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#4F98C2] px-3 text-xs font-semibold text-white hover:bg-[#3f86b0] transition"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              Editar planejamento
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/advisor/planejamento/${encodeURIComponent(client.clientUserId)}/progresso?name=${encodeURIComponent(client.name)}`)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                              Acompanhar progresso
                            </button>
                            <ClientAction label="Cartões" Icon={CreditCard} onClick={() => openClientDashboard(client, '/dashboard/futuros')} />
                            <ClientAction label="WhatsApp" Icon={MessageCircle} onClick={() => openWhatsApp(client.phone)} />
                            <button
                              type="button"
                              disabled={revokeClientMutation.isPending}
                              onClick={() => revokeClientMutation.mutate(client.id)}
                              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                              aria-label="Mais opções"
                              title="Mais opções"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                          </article>
                          </SortableClientCard>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Página {clientsPage} de {clientsTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setClientsPage((prev) => Math.max(1, prev - 1))}
                      disabled={clientsPage <= 1}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientsPage((prev) => Math.min(clientsTotalPages, prev + 1))}
                      disabled={!clientsMeta?.hasNext || clientsPage >= clientsTotalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </section>

              {/* Lista de convites pendentes */}
              <AdvisorInviteGenerationSection showGenerator={false} />

              {/* Consultores da organização — visível apenas para MASTER */}
              {isMaster && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#2F6E91]" />
                      <div>
                        <h2 className="text-base font-semibold text-[#253140]">Consultores da organização</h2>
                        <p className="mt-0.5 text-sm text-slate-600">
                          Visão consolidada da equipe de consultores.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddConsultorOpen(true)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-[#3f86b0]"
                    >
                      <UserPlus className="h-4 w-4" />
                      Novo Consultor
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {MOCK_CONSULTORES.map((consultor) => (
                      <article
                        key={consultor.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#253140] text-sm font-semibold text-white">
                            {initials(consultor.name)}
                          </div>
                          <span className={[
                            'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                            consultor.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : consultor.status === 'pending'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-slate-100 text-slate-600',
                          ].join(' ')}>
                            {consultor.status === 'active' ? 'Ativo' : consultor.status === 'pending' ? 'Pendente' : 'Inativo'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-[#253140]">{consultor.name}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{consultor.email}</p>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-base font-semibold text-[#253140]">{consultor.activeClients}</p>
                            <p className="text-[10px] text-slate-500">Clientes</p>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-[#253140]">{consultor.pendingInvites}</p>
                            <p className="text-[10px] text-slate-500">Convites</p>
                          </div>
                          <div>
                            <p className={['text-base font-semibold', consultor.criticalClients > 0 ? 'text-red-600' : 'text-[#253140]'].join(' ')}>
                              {consultor.criticalClients}
                            </p>
                            <p className="text-[10px] text-slate-500">Críticos</p>
                          </div>
                        </div>
                        {consultor.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setConsultorFilter(consultor.id)}
                            className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Ver carteira
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
      </section>

      {/* Drawer de convites */}
      <Sheet open={inviteDrawerOpen} onOpenChange={setInviteDrawerOpen}>
        <SheetContent className="!w-[min(960px,94vw)] overflow-y-auto border-slate-200 bg-[#F5F7FA] p-0 sm:!max-w-[960px]">
          <div className="p-6">
            <SheetHeader className="mb-5 text-left">
              <SheetTitle className="text-xl text-[#253140]">Gerar convites</SheetTitle>
              <SheetDescription>
                Escolha o tipo de conta, defina quem paga e gere o link de acesso do cliente.
              </SheetDescription>
            </SheetHeader>

            <AdvisorInviteGenerationSection
              generatorSurface="drawer"
              isOrgAdmin={isMaster}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer rápido do cliente */}
      <ClientQuickViewDrawer
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onOpenDashboard={(client) => openClientDashboard(client)}
        onOpenReport={(client) =>
          openClientDashboard(
            client,
            `/advisor/relatorio-cliente?clientId=${encodeURIComponent(client.clientUserId)}`
          )
        }
      />

      {/* Modal de alertas */}
      <ClientAlertsDialog
        group={selectedAlertGroup}
        onClose={() => setSelectedAlertGroup(null)}
        onOpenDashboard={(client) => openClientDashboard(client)}
      />

      {/* Modal de clientes por insight */}
      <InsightClientsDialog
        insight={selectedInsight}
        onClose={() => setSelectedInsight(null)}
        onOpenDashboard={(client) => openClientDashboard(client)}
        onOpenReport={(client) =>
          openClientDashboard(
            client,
            `/advisor/relatorio-cliente?clientId=${encodeURIComponent(client.clientUserId)}`
          )
        }
      />

      {/* Modal adicionar consultor */}
      <AddConsultorDialog
        open={addConsultorOpen}
        onClose={() => setAddConsultorOpen(false)}
      />

      <Toaster />
    </AdvisorGuard>
  )
}

export default function AdvisorPage() {
  return <AdvisorPageInner />
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'red' | 'amber' }) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : 'text-[#253140]'
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className={['mt-1 truncate text-sm font-semibold', toneClass].join(' ')}>{value}</p>
    </div>
  )
}

function ClientAction({ label, Icon, onClick }: { label: string; Icon: typeof LayoutDashboard; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function MovimentacaoItem({ label, value, date }: { label: string; value: number; date?: string }) {
  const isPositive = value >= 0
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-700">{label}</p>
        {date && <p className="text-[11px] text-slate-400">{date}</p>}
      </div>
      <p className={['flex-shrink-0 text-sm font-semibold', isPositive ? 'text-emerald-700' : 'text-red-700'].join(' ')}>
        {isPositive ? '+' : ''}{formatCurrencyByPreference(Math.abs(value))}
      </p>
    </div>
  )
}

function ClientAlertsDialog({
  group,
  onClose,
  onOpenDashboard,
}: {
  group: AdvisorAlertGroup | null
  onClose: () => void
  onOpenDashboard: (client: EnrichedClient) => void
}) {
  return (
    <Dialog open={Boolean(group)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-2xl sm:rounded-2xl">
        {group && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#253140]">
                Alertas de {group.client.name}
              </DialogTitle>
              <DialogDescription>
                {group.alerts.length} ponto{group.alerts.length > 1 ? 's' : ''} de atenção identificado{group.alerts.length > 1 ? 's' : ''} para este cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              {group.alerts.map((alert) => (
                <article
                  key={`${group.client.id}-${alert.title}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={[
                      'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                      alert.tone === 'red'
                        ? 'bg-red-100 text-red-600'
                        : alert.tone === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-600',
                    ].join(' ')}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#253140]">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{alert.impact}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => onOpenDashboard(group.client)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
              >
                Abrir Dashboard
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InsightClientsDialog({
  insight,
  onClose,
  onOpenDashboard,
  onOpenReport,
}: {
  insight: AdvisorInsightItem | null
  onClose: () => void
  onOpenDashboard: (client: EnrichedClient) => void
  onOpenReport: (client: EnrichedClient) => void
}) {
  return (
    <Dialog open={Boolean(insight)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-200 bg-white sm:max-w-2xl sm:rounded-2xl">
        {insight && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#253140]">
                Clientes relacionados a este insight
              </DialogTitle>
              <DialogDescription>
                {insight.insightLabel} — {insight.clients.length} cliente{insight.clients.length !== 1 ? 's' : ''} identificado{insight.clients.length !== 1 ? 's' : ''}.
              </DialogDescription>
            </DialogHeader>

            {insight.clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Nenhum cliente relacionado a este insight no momento.
              </div>
            ) : (
              <div className="max-h-[480px] space-y-3 overflow-y-auto">
                {insight.clients.map((client) => (
                  <article key={client.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#253140] text-xs font-semibold text-white">
                        {initials(client.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#253140]">{client.name}</p>
                          <span className="rounded-full border border-[#D7EAF5] bg-[#F3FAFF] px-2 py-0.5 text-[11px] font-semibold text-[#2F6E91]">
                            {client.accountType === 'COUPLE' ? 'Casal' : 'Individual'}
                          </span>
                          <span className={['rounded-full border px-2 py-0.5 text-[11px] font-semibold', statusBadgeClass(client.riskStatus)].join(' ')}>
                            {client.riskStatus}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Saúde financeira: {client.healthScore}/100 — Última atividade: {client.lastActivityLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {insight.insightLabel}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { onOpenReport(client); onClose() }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver Relatório
                      </button>
                      <button
                        type="button"
                        onClick={() => { onOpenDashboard(client); onClose() }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-[#3f86b0]"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Abrir Dashboard
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ClientQuickViewDrawer({
  client,
  onClose,
  onOpenDashboard,
  onOpenReport,
}: {
  client: EnrichedClient | null
  onClose: () => void
  onOpenDashboard: (client: EnrichedClient) => void
  onOpenReport: (client: EnrichedClient) => void
}) {
  const formatCurrency = (value?: number | null) => formatCurrencyByPreference(Number(value ?? 0))

  return (
    <Sheet open={Boolean(client)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="!w-[min(760px,92vw)] overflow-y-auto border-slate-200 bg-white p-0 sm:!max-w-[760px]">
        {client && (
          <div className="p-6">
            <SheetHeader>
              <SheetTitle className="text-xl text-[#253140]">{client.name}</SheetTitle>
              <SheetDescription>
                Visualização rápida operacional do cliente no painel Advisor.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Saldo atual" value={formatCurrency(client.balance)} />
              <Metric label="Gastos do mês" value={formatCurrency(client.expense)} tone="red" />
              <Metric label="Receitas" value={formatCurrency(client.income)} tone="emerald" />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Saúde financeira</p>
                  <p className="mt-1 text-2xl font-semibold text-[#253140]">{client.healthScore}/100</p>
                </div>
                <span className={['rounded-full border px-3 py-1 text-xs font-semibold', statusBadgeClass(client.riskStatus)].join(' ')}>
                  {client.riskStatus}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div className={['h-2 rounded-full', scoreClass(client.healthScore)].join(' ')} style={{ width: `${client.healthScore}%` }} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Panel title="Receitas × Despesas" Icon={BarChart3}>
                <div className="flex h-36 items-end gap-2">
                  {client.trend.map((value, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-[#4F98C2]" style={{ height: `${value}%` }} />
                      <div className="w-full rounded-t bg-[#E7B75F]" style={{ height: `${Math.max(16, value - 22)}%` }} />
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Situação atual dos gastos" Icon={WalletCards}>
                <div className="space-y-3">
                  {client.categoryMix.map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className={['h-2 rounded-full', item.color].join(' ')} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Próximos vencimentos" Icon={CalendarDays}>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Cartão principal: {formatCurrency(client.creditSpending)} em 5 dias</p>
                  <p>Conta fixa recorrente: {formatCurrency(client.expense * 0.18)} em 9 dias</p>
                  <p>Parcelamentos ativos: {Math.max(1, hashText(client.id) % 5)}</p>
                </div>
              </Panel>

              <Panel title="Últimas movimentações" Icon={Activity}>
                <div className="space-y-3">
                  <MovimentacaoItem
                    label="Alimentação"
                    value={-(client.expense * 0.08)}
                    date="Hoje"
                  />
                  <MovimentacaoItem
                    label="Salário"
                    value={client.income * 0.42}
                    date="Ontem"
                  />
                  <MovimentacaoItem
                    label="Cartão de Crédito"
                    value={-client.creditSpending}
                    date="Há 2 dias"
                  />
                </div>
              </Panel>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenDashboard(client)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
              >
                <LayoutDashboard className="h-4 w-4" />
                Entrar no dashboard completo
              </button>
              <button
                type="button"
                onClick={() => { onOpenReport(client); onClose() }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Ver Relatório
              </button>
              <button
                type="button"
                onClick={() => openWhatsApp(client.phone)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Panel({ title, Icon, children }: { title: string; Icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2F6E91]" />
        <h3 className="text-sm font-semibold text-[#253140]">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function AddConsultorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [funcao, setFuncao] = useState('ADVISOR')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-slate-200 bg-white sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#253140]">Novo consultor</DialogTitle>
          <DialogDescription>
            Preencha os dados e envie o convite de acesso ao consultor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Nome completo</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex: Rafael Mendes"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="consultor@escritorio.com"
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Função</span>
            <select
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-[#7CB8D8]"
            >
              <option value="ADVISOR">Consultor</option>
              <option value="ORG_ADMIN">Administrador</option>
            </select>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-[#3f86b0]"
            >
              <UserPlus className="h-4 w-4" />
              Enviar convite
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

