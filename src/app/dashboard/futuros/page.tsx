'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  Filter,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts'
import toast from 'react-hot-toast'
import { useLocale, useTranslations } from 'next-intl'

import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/skeleton'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

import { useCategories } from '@/hooks/query/useCategory'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import { useCreditCardCharges } from '@/hooks/query/useCreditCardCharges'
import {
  FutureEditableInstallmentStatus,
  FutureInstallment,
  FutureInstallmentPlan,
  FutureItem,
  FuturePaymentType,
  FuturePlanStatus,
  FutureStatus,
  FutureType,
  InvoiceGroup,
  groupCreditCardInvoices,
} from '@/services/futureService'
import {
  useFutureForecast,
  useFutureInstallments,
  useFutureMutations,
  useFuturePlans,
} from '@/hooks/query/useFuture'
import CreditCardChargeDrawer from '../components/CreditCardChargeDrawer'
import type { CreditCardChargeItem } from '@/services/creditCardCharges'
import type { CreditCardResponse } from '@/services/cards'
import { useFinancialScope } from '@/hooks/useFinancialScope'
import { useUserSession } from '@/stores/useUserSession'
import type { HouseContext, HouseMember } from '@/types/house'
import { formatCurrency } from '@/utils/formatter'
import { Button } from '@/components/ui/button'
import CreditCardManagerDrawer, {
  DEFAULT_CARD_COLOR,
  readCreditCardColorMap,
  type CreditCardManagerView,
  type CreditCardMetrics,
  writeCreditCardColorMap,
} from './components/CreditCardManagerDrawer'
import FinancialScopeSwitcher from '@/components/financial/FinancialScopeSwitcher'

// ─── Types ───────────────────────────────────────────────────────────────────

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string
type PeriodOption = '30d' | '60d' | '90d' | 'this_month' | 'next_month'
type ForecastTab = 'expense' | 'income'

const PERIOD_LABELS: Record<PeriodOption, string> = {
  '30d': '30 dias',
  '60d': '60 dias',
  '90d': '90 dias',
  this_month: 'Este mês',
  next_month: 'Próximo mês',
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

function buildPlanSchema(t: TranslatorFn) {
  return z.object({
    description: z.string().min(2, t('validation.plan.descriptionRequired')),
    type: z.enum(['EXPENSE', 'INCOME']),
    paymentType: z.enum([
      'DEBIT_CARD','CREDIT_CARD','PIX','BOLETO','TED','DOC','MONEY','CASH','OTHER',
    ]),
    categoryId: z.string().optional(),
    cardId: z.string().optional(),
    totalAmount: z.coerce.number().min(0.01, t('validation.plan.totalAmountMin')),
    installmentCount: z.coerce.number().int().min(1, t('validation.plan.installmentCountMin')).max(240, t('validation.plan.installmentCountMax')),
    intervalMonths: z.coerce.number().int().min(1, t('validation.plan.intervalMonthsMin')).max(12, t('validation.plan.intervalMonthsMax')),
    firstDueDate: z.string().min(1, t('validation.plan.firstDueDateRequired')),
    status: z.enum(['active', 'completed', 'canceled']).optional(),
    recalculateRemaining: z.boolean().optional(),
    notes: z.string().optional(),
  })
}

const settleSchema = z.object({
  amount: z.string().optional(),
  paidAt: z.string().optional(),
})

function buildInstallmentEditSchema(t: TranslatorFn) {
  return z.object({
    amount: z.coerce.number().min(0.01, t('validation.installment.amountMin')),
    dueDate: z.string().min(1, t('validation.installment.dueDateRequired')),
    status: z.enum(['pending', 'canceled']),
    recalculateRemaining: z.boolean(),
  })
}

type PlanFormData = z.infer<ReturnType<typeof buildPlanSchema>>
type SettleFormData = z.infer<typeof settleSchema>
type InstallmentEditFormData = z.infer<ReturnType<typeof buildInstallmentEditSchema>>

// ─── Option builders ─────────────────────────────────────────────────────────

function buildPaymentTypeOptions(t: TranslatorFn): { value: FuturePaymentType; label: string }[] {
  return [
    { value: 'DEBIT_CARD', label: t('options.paymentType.debitCard') },
    { value: 'CREDIT_CARD', label: t('options.paymentType.creditCard') },
    { value: 'PIX', label: t('options.paymentType.pix') },
    { value: 'BOLETO', label: t('options.paymentType.boleto') },
    { value: 'TED', label: t('options.paymentType.ted') },
    { value: 'DOC', label: t('options.paymentType.doc') },
    { value: 'MONEY', label: t('options.paymentType.money') },
    { value: 'CASH', label: t('options.paymentType.cash') },
    { value: 'OTHER', label: t('options.paymentType.other') },
  ]
}

function buildStatusOptions(t: TranslatorFn): { value: '' | FutureStatus; label: string }[] {
  return [
    { value: '', label: t('options.statusFilter.all') },
    { value: 'pending', label: t('options.statusFilter.pending') },
    { value: 'overdue', label: t('options.statusFilter.overdue') },
    { value: 'settled', label: t('options.statusFilter.settled') },
    { value: 'canceled', label: t('options.statusFilter.canceled') },
  ]
}

function buildTypeOptions(t: TranslatorFn): { value: '' | FutureType; label: string }[] {
  return [
    { value: '', label: t('options.typeFilter.all') },
    { value: 'EXPENSE', label: t('options.typeFilter.expense') },
    { value: 'INCOME', label: t('options.typeFilter.income') },
  ]
}

function buildPlanStatusOptions(t: TranslatorFn): { value: FuturePlanStatus; label: string }[] {
  return [
    { value: 'active', label: t('options.planStatus.active') },
    { value: 'completed', label: t('options.planStatus.completed') },
    { value: 'canceled', label: t('options.planStatus.canceled') },
  ]
}

function buildInstallmentEditableStatusOptions(t: TranslatorFn): { value: FutureEditableInstallmentStatus; label: string }[] {
  return [
    { value: 'pending', label: t('options.installmentStatus.pending') },
    { value: 'canceled', label: t('options.installmentStatus.canceled') },
  ]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrencyBRL(value: number) {
  return formatCurrency(Number(value || 0), { locale: 'pt-BR', currency: 'BRL' })
}

function formatBRL(value: number) {
  return formatCurrencyBRL(value)
}

function roundCurrency(v: number) {
  return Math.round(Number(v || 0) * 100) / 100
}

function formatDateByLocale(iso: string | null | undefined, locale: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(locale)
}

function formatDateBR(iso: string | null | undefined) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatCycleKey(cycleKey: string | null | undefined): string {
  if (!cycleKey) return '-'
  const [year, month] = cycleKey.split('-')
  if (!year || !month) return cycleKey
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return cycleKey
  const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `Fatura ${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}/${year}`
}

function installmentBadge(num: number, count: number | null): string {
  if (!count || count <= 1) return 'À vista'
  return `${num}/${count}`
}

function installmentTableLabel(num: number, count: number | null): string {
  if (!count || count <= 1) return '1/1 (À vista)'
  return `${num}/${count}`
}

function getInvoiceGroupKey(group: InvoiceGroup) {
  return `${group.card?.id ?? 'unknown'}__${group.statement?.cycleKey ?? 'unknown'}`
}

function getCardAccentColor(cardId: string | null | undefined, cardColors: Record<string, string>) {
  if (!cardId) return DEFAULT_CARD_COLOR
  return cardColors[cardId] ?? DEFAULT_CARD_COLOR
}

function getDateParts(iso: string | null | undefined) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return { day: '--', month: '---' }

  return {
    day: d.toLocaleDateString('pt-BR', { day: '2-digit' }),
    month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
  }
}

function getCategoryColor(seed: string | null | undefined) {
  const colors = [
    'bg-rose-100 text-rose-600',
    'bg-emerald-100 text-emerald-600',
    'bg-blue-100 text-blue-600',
    'bg-violet-100 text-violet-600',
    'bg-orange-100 text-orange-600',
    'bg-cyan-100 text-cyan-600',
  ]
  const value = seed ?? 'default'
  const index = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

const CATEGORY_HEX_COLORS = [
  '#E11D48',
  '#059669',
  '#2563EB',
  '#7C3AED',
  '#F97316',
  '#0891B2',
  '#475569',
  '#DB2777',
]

type CreditDistributionItem = {
  id: string
  name: string
  value: number
  color: string
  percent: number
}

type CardOwnerSection = {
  id: string
  label: string
  cards: CreditCardResponse[]
}

function getCategoryHexColor(seed: string | null | undefined, preferred?: string | null) {
  if (preferred && /^#[0-9A-Fa-f]{6}$/.test(preferred)) return preferred
  const value = seed ?? 'default'
  const index = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % CATEGORY_HEX_COLORS.length
  return CATEGORY_HEX_COLORS[index]
}

function formatCardDisplayName(card: { name?: string | null; last4?: string | null }) {
  const name = card.name || 'Cartao'
  return card.last4 ? `${name} final ${card.last4}` : name
}

function getFirstName(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0]
}

function getMemberName(member: HouseMember | null | undefined, fallback: string) {
  return getFirstName(member?.name) || member?.email || fallback
}

function getCardOwnerSections(params: {
  cards: CreditCardResponse[]
  houseContext?: HouseContext | null
  currentUserId?: string | null
  currentUserName?: string | null
}): CardOwnerSection[] {
  const { cards, houseContext, currentUserId, currentUserName } = params
  const activeMembers = (houseContext?.members ?? []).filter((member) => member.active)
  const hasCoupleCards = houseContext?.status === 'COUPLE' && activeMembers.length > 1

  if (!hasCoupleCards) {
    return [{ id: 'me', label: 'Meus cartoes', cards }]
  }

  const memberSections = activeMembers
    .map((member) => {
      const memberId = member.userId ?? member.id ?? ''
      const label = `Cartoes ${getMemberName(
        member,
        memberId && memberId === currentUserId ? currentUserName || 'meus' : 'usuario'
      )}`.toUpperCase()

      return {
        id: memberId || member.role || label,
        label,
        cards: cards.filter((card) => card.userId === memberId),
      }
    })
    .filter((section) => section.cards.length > 0)

  const knownOwnerIds = new Set(activeMembers.map((member) => member.userId ?? member.id).filter(Boolean))
  const orphanCards = cards.filter((card) => !knownOwnerIds.has(card.userId))

  if (orphanCards.length) {
    memberSections.push({
      id: 'unassigned',
      label: 'OUTROS CARTOES',
      cards: orphanCards,
    })
  }

  return memberSections.length ? memberSections : [{ id: 'house', label: 'CARTOES DA CONTA', cards }]
}

function getStatementDisplayStatus(statement: InvoiceGroup['statement'] | null | undefined) {
  if (!statement) return 'open'
  if (statement.status === 'paid') return 'paid'
  const due = statement.dueAt ? new Date(statement.dueAt) : null
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  if (statement.status !== 'paid' && due && !Number.isNaN(due.getTime()) && due < todayEnd) {
    return 'overdue'
  }
  if (statement.status === 'invoiced') return 'invoiced'
  return 'open'
}

function addMonths(base: Date, months: number) {
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return next
}

function getPlanMonthlyAmount(plan: FutureInstallmentPlan) {
  const count = Math.max(1, Number(plan.installmentCount || 1))
  return Number(plan.totalAmount || 0) / count
}

function getPlanProgress(plan: FutureInstallmentPlan) {
  const count = Math.max(1, Number(plan.installmentCount || 1))
  const interval = Math.max(1, Number(plan.intervalMonths || 1))
  const first = new Date(plan.firstDueDate)
  if (Number.isNaN(first.getTime())) {
    return { installmentNumber: 1, nextDueDate: plan.firstDueDate }
  }

  const now = new Date()
  const monthDiff = (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth())
  const zeroBased = Math.max(0, Math.floor(monthDiff / interval))
  const installmentNumber = Math.min(count, zeroBased + 1)
  return {
    installmentNumber,
    nextDueDate: addMonths(first, (installmentNumber - 1) * interval).toISOString(),
  }
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from: start, to: end }
}

function isWithinCurrentMonth(iso: string | null | undefined) {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function buildCreditDistribution(
  items: Array<{ categoryId: string | null; categoryName: string; categoryColor?: string | null; amount: number }>
) {
  const grouped = items.reduce<Record<string, { id: string; name: string; value: number; color: string }>>((acc, item) => {
    const id = item.categoryId || item.categoryName || 'sem-categoria'
    const current = acc[id] ?? {
      id,
      name: item.categoryName || 'Sem categoria',
      value: 0,
      color: getCategoryHexColor(id, item.categoryColor),
    }
    current.value += Number(item.amount || 0)
    acc[id] = current
    return acc
  }, {})
  const total = Object.values(grouped).reduce((sum, item) => sum + item.value, 0)
  return Object.values(grouped)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ ...item, percent: total > 0 ? (item.value / total) * 100 : 0 }))
}

function canEditForecastItem(item: FutureItem) {
  return (
    item.sourceType === 'installment_plan' &&
    Boolean(item.type) &&
    (item.status === 'pending' || item.status === 'overdue')
  )
}

function toEditableInstallment(item: FutureItem): FutureInstallment | null {
  if (!canEditForecastItem(item) || !item.type) return null

  return {
    id: item.id,
    planId: null,
    description: item.description ?? 'Sem descrição',
    type: item.type,
    paymentType: (item.paymentType ?? null) as FuturePaymentType | null,
    categoryId: item.category?.id ?? null,
    cardId: item.card?.id ?? null,
    installmentNumber: Number(item.installmentNumber || 1),
    installmentCount: Number(item.installmentCount || 1),
    amount: Number(item.amount || 0),
    dueDate: item.dueDate,
    status: item.status === 'overdue' ? 'overdue' : 'pending',
    paidAt: null,
  }
}

function toDateInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function toIsoFromDateInput(value: string) {
  if (!value) return undefined
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function calcEffectiveStatus(i: FutureInstallment): FutureStatus {
  if (i.status === 'settled' || i.status === 'canceled' || i.status === 'overdue') return i.status
  const due = new Date(i.dueDate)
  if (Number.isNaN(due.getTime())) return i.status
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  if (due < todayEnd) return 'overdue'
  return 'pending'
}

function statusBadgeClass(status: FutureStatus) {
  if (status === 'settled') return 'bg-emerald-100 text-emerald-700'
  if (status === 'overdue') return 'bg-red-100 text-red-700'
  if (status === 'canceled') return 'bg-slate-200 text-slate-700'
  return 'bg-amber-100 text-amber-700'
}

function statusLabel(status: FutureStatus, t: TranslatorFn) {
  if (status === 'pending') return t('status.pending')
  if (status === 'overdue') return t('status.overdue')
  if (status === 'settled') return t('status.settled')
  if (status === 'canceled') return t('status.canceled')
  return status
}

function forecastStatusBadge(status: string) {
  if (status === 'overdue') return 'bg-red-100 text-red-700'
  if (status === 'invoiced') return 'bg-amber-100 text-amber-700'
  if (status === 'open') return 'bg-sky-100 text-sky-700'
  return 'bg-gray-100 text-gray-600'
}

function forecastStatusLabel(status: string) {
  if (status === 'overdue') return 'Vencido'
  if (status === 'invoiced') return 'Faturado'
  if (status === 'open') return 'Aberto'
  if (status === 'pending') return 'Pendente'
  return status
}

function statementStatusBadge(status: string) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700'
  if (status === 'overdue') return 'bg-red-100 text-red-700'
  if (status === 'invoiced') return 'bg-amber-100 text-amber-700'
  return 'bg-sky-100 text-sky-700'
}

function statementStatusLabel(status: string) {
  if (status === 'paid') return 'Paga'
  if (status === 'overdue') return 'Atrasada'
  if (status === 'invoiced') return 'Fechada'
  return 'Aberta'
}

function normalizePlanStatus(raw?: string | null): FuturePlanStatus {
  const value = (raw ?? '').toString().toLowerCase()
  if (value === 'completed') return 'completed'
  if (value === 'canceled') return 'canceled'
  return 'active'
}

function mapFutureDomainError(message: string, t: TranslatorFn) {
  const m = (message || '').toLowerCase()
  if (m.includes('amountexceedsplantotal')) return t('errors.amountExceedsPlanTotal')
  if (m.includes('plantotalmismatch')) return t('errors.planTotalMismatch')
  if (m.includes('status') && (m.includes('parcela liquidada') || m.includes('settled'))) {
    return t('errors.settledInstallmentLocked')
  }
  return message || t('errors.operationFailed')
}

function computeForecastParams(period: PeriodOption): { days?: number; from?: string; to?: string } {
  if (period === '30d') return { days: 30 }
  if (period === '60d') return { days: 60 }
  if (period === '90d') return { days: 90 }
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (period === 'this_month') {
    return {
      from: new Date(y, m, 1).toISOString().slice(0, 10),
      to: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    }
  }
  return {
    from: new Date(y, m + 1, 1).toISOString().slice(0, 10),
    to: new Date(y, m + 2, 0).toISOString().slice(0, 10),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type SummaryTone = 'red' | 'green' | 'amber' | 'blue' | 'purple'

const summaryToneClasses: Record<
  SummaryTone,
  { card: string; icon: string; title: string; value: string; pulse: string }
> = {
  red: {
    card: 'border-red-100 bg-gradient-to-br from-white via-red-50/80 to-red-50',
    icon: 'bg-red-100/80 text-red-600',
    title: 'text-red-600',
    value: 'text-red-700',
    pulse: 'bg-red-100',
  },
  green: {
    card: 'border-emerald-100 bg-gradient-to-br from-white via-emerald-50/80 to-emerald-50',
    icon: 'bg-emerald-100/80 text-emerald-600',
    title: 'text-emerald-600',
    value: 'text-emerald-700',
    pulse: 'bg-emerald-100',
  },
  amber: {
    card: 'border-amber-100 bg-gradient-to-br from-white via-amber-50/80 to-amber-50',
    icon: 'bg-amber-100/80 text-amber-600',
    title: 'text-amber-700',
    value: 'text-amber-700',
    pulse: 'bg-amber-100',
  },
  blue: {
    card: 'border-blue-100 bg-gradient-to-br from-white via-blue-50/80 to-blue-50',
    icon: 'bg-blue-100/80 text-primary',
    title: 'text-primary',
    value: 'text-primary',
    pulse: 'bg-blue-100',
  },
  purple: {
    card: 'border-violet-100 bg-gradient-to-br from-white via-violet-50/80 to-violet-50',
    icon: 'bg-violet-100/80 text-violet-700',
    title: 'text-violet-700',
    value: 'text-violet-700',
    pulse: 'bg-violet-100',
  },
}

function SummaryCard({
  title,
  value,
  subtext,
  icon: Icon,
  tone,
  loading,
  onClick,
}: {
  title: string
  value: string | number
  subtext: string
  icon: React.ComponentType<{ className?: string }>
  tone: SummaryTone
  loading: boolean
  onClick?: () => void
}) {
  const classes = summaryToneClasses[tone]
  const content = (
    <div className="flex items-start gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-bold ${classes.title}`}>{title}</p>
        {loading ? (
          <div className={`mt-3 h-7 w-24 animate-pulse rounded-md ${classes.pulse}`} />
        ) : (
          <p className={`mt-2 text-2xl font-extrabold tracking-normal ${classes.value}`}>
            {value}
          </p>
        )}
        <p className="mt-2 truncate text-xs font-medium text-slate-500">{subtext}</p>
      </div>
    </div>
  )

  const className = `min-h-[118px] w-full rounded-[20px] border p-5 text-left shadow-[0_12px_34px_rgba(15,23,42,0.05)] transition-transform ${onClick ? 'hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]' : ''} ${classes.card}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return (
    <div className={className}>
      {content}
    </div>
  )
}

function ForecastTabs({
  active,
  onChange,
}: {
  active: ForecastTab
  onChange: (tab: ForecastTab) => void
}) {
  return (
    <div className="border-b border-slate-200">
      <div className="flex gap-7">
        {[
          { value: 'expense' as const, label: 'Despesas' },
          { value: 'income' as const, label: 'Receitas' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-extrabold transition-colors ${
              active === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ForecastSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div key={item} className="h-[250px] animate-pulse rounded-[18px] border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-[104px] animate-pulse rounded-[18px] border border-slate-200 bg-white" />
      <div className="h-[104px] animate-pulse rounded-[18px] border border-slate-200 bg-white" />
    </div>
  )
}

function InvoiceGroupAccordion({
  group,
  groupKey,
  isOpen,
  onToggle,
  cardColor,
}: {
  group: InvoiceGroup
  groupKey: string
  isOpen: boolean
  onToggle: (key: string) => void
  cardColor?: string
}) {
  const accent = cardColor ?? DEFAULT_CARD_COLOR
  const cardLabel = `${group.card?.name ?? 'Cartão'}${group.card?.last4 ? ` •• ${group.card.last4}` : ''}`
  const statementLine = group.statement
    ? `${formatCycleKey(group.statement.cycleKey)} · Fecha em ${formatDateShort(group.statement.closingAt)} · Vence em ${formatDateShort(group.statement.dueAt)}`
    : 'Fatura sem período'

  return (
    <article
      className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)]"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <button
        type="button"
        onClick={() => onToggle(groupKey)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <p className="truncate text-sm font-extrabold text-slate-900">{cardLabel}</p>
              {group.statement && (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statementStatusBadge(group.statement.status)}`}>
                  {statementStatusLabel(group.statement.status)}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">{statementLine}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] font-bold text-slate-500">Total da fatura</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">{formatCurrencyBRL(group.totalAmount)}</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100">
          <div className="hidden grid-cols-[1.2fr_1.7fr_0.9fr_0.9fr_1fr] gap-4 bg-slate-50 px-5 py-3 text-[11px] font-extrabold text-slate-500 md:grid">
            <span>Categoria</span>
            <span>Descrição</span>
            <span>Parcela</span>
            <span>Status</span>
            <span className="text-right">Valor</span>
          </div>
          <div className="divide-y divide-slate-100">
            {group.items.map((item) => {
              const categoryName = item.category?.name ?? 'Sem categoria'
              const categoryColor = getCategoryColor(item.category?.id ?? categoryName)

              return (
                <div
                  key={item.id}
                  className="grid gap-3 px-5 py-4 text-sm transition-colors hover:bg-slate-50/70 md:grid-cols-[1.2fr_1.7fr_0.9fr_0.9fr_1fr] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${categoryColor}`}>
                      <span className="h-2 w-2 rounded-full bg-current" />
                    </span>
                    <span className="truncate font-medium text-slate-600">{categoryName}</span>
                  </div>
                  <p className="min-w-0 truncate font-semibold text-slate-800">{item.description ?? 'Sem descrição'}</p>
                  <p className="text-slate-600">{installmentTableLabel(item.installmentNumber, item.installmentCount)}</p>
                  <span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${forecastStatusBadge(item.status)}`}>
                      {forecastStatusLabel(item.status)}
                    </span>
                  </span>
                  <p className="font-extrabold text-slate-900 md:text-right">{formatCurrencyBRL(item.amount)}</p>
                </div>
              )
            })}
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs font-medium text-slate-500">
            {group.items.length} {group.items.length === 1 ? 'item nesta fatura' : 'itens nesta fatura'}
          </div>
        </div>
      )}
    </article>
  )
}

function CommitmentCard({
  item,
  onSettle,
  onEdit,
  onDelete,
}: {
  item: FutureItem
  onSettle: (installment: FutureInstallment) => void
  onEdit: (installment: FutureInstallment) => void
  onDelete: (installment: FutureInstallment) => void
}) {
  const isIncome = item.type === 'INCOME'
  const dateParts = getDateParts(item.dueDate)
  const editableInstallment = toEditableInstallment(item)
  const categoryName = item.category?.name ?? 'Sem categoria'

  return (
    <article className="grid gap-4 border-t border-slate-100 bg-white px-5 py-4 first:border-t-0 md:grid-cols-[84px_1.5fr_0.75fr_1fr_0.9fr_0.8fr_42px] md:items-center">
      <div className="flex items-center gap-3 md:block md:text-center">
        <div className="text-2xl font-extrabold leading-none text-slate-900">{dateParts.day}</div>
        <div className="mt-1 text-xs font-extrabold text-slate-500">{dateParts.month}</div>
      </div>

      <div className="flex min-w-0 items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
          <ReceiptText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-slate-900">{item.description ?? 'Sem descrição'}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
              {installmentBadge(item.installmentNumber, item.installmentCount)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">{categoryName}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-900">
          {Number(item.installmentCount || 1) > 1
            ? `${item.installmentNumber}/${item.installmentCount}`
            : '1 parcela'}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {Number(item.installmentCount || 1) > 1 ? 'Parcelamento' : 'À vista'}
        </p>
      </div>

      <div>
        <p className="text-sm font-extrabold text-slate-900">{formatDateBR(item.dueDate)}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">Vencimento</p>
      </div>

      <div>
        <p className={`text-sm font-extrabold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isIncome ? '' : '-'}{formatCurrencyBRL(item.amount)}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">{isIncome ? 'Receita' : 'Despesa'}</p>
      </div>

      <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-extrabold ${forecastStatusBadge(item.status)}`}>
        {forecastStatusLabel(item.status)}
      </span>

      <Menu as="div" className="relative justify-self-start md:justify-self-end">
        <MenuButton className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <MoreHorizontal className="h-5 w-5" />
        </MenuButton>
        <MenuItems className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-xl outline-none">
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                disabled={!editableInstallment}
                onClick={() => editableInstallment && onSettle(editableInstallment)}
                className={`w-full rounded-lg px-3 py-2 text-left font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}
              >
                Dar baixa
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                disabled={!editableInstallment}
                onClick={() => editableInstallment && onEdit(editableInstallment)}
                className={`w-full rounded-lg px-3 py-2 text-left font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}
              >
                Editar parcela
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                disabled={!editableInstallment}
                onClick={() => editableInstallment && onDelete(editableInstallment)}
                className={`w-full rounded-lg px-3 py-2 text-left font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus ? 'bg-red-50 text-red-700' : 'text-red-600'}`}
              >
                Excluir
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>
    </article>
  )
}

function ForecastEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-primary">
        <CalendarDays className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-base font-extrabold text-slate-900">Nenhum compromisso futuro no período selecionado</h3>
      <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">
        Quando você registrar uma despesa futura, parcelamento ou compra no cartão, ela aparecerá aqui.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,163,0.24)] transition-colors hover:bg-secondary"
      >
        <Plus className="h-4 w-4" />
        Registrar despesa futura
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function CreditTreemapNode(props: {
  x?: number
  y?: number
  width?: number
  height?: number
  depth?: number
  name?: string
  color?: string
  size?: number
}) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const width = Number(props.width ?? 0)
  const height = Number(props.height ?? 0)
  const depth = Number(props.depth ?? 0)
  const color = props.color || '#CBD5E1'
  const canLabel = depth === 1 && width >= 82 && height >= 42
  const label = props.name ?? ''
  const maxChars = Math.max(8, Math.floor(width / 7))

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} ry={6} fill={depth === 1 ? color : 'transparent'} stroke="#fff" strokeWidth={2} />
      {canLabel && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={width >= 140 ? 12 : 10} fontWeight={700} pointerEvents="none">
          {label.length > maxChars ? `${label.slice(0, maxChars - 3)}...` : label}
        </text>
      )}
    </g>
  )
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: { name?: string; value?: number; size?: number; total?: number }; value?: number }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const value = Number(row?.value ?? row?.size ?? row?.total ?? payload[0]?.value ?? 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xl">
      <p className="text-slate-900">{row?.name ?? 'Categoria'}</p>
      <p className="mt-1">{formatCurrencyBRL(value)}</p>
    </div>
  )
}

function CreditDistributionChart({ items, height = 220 }: { items: CreditDistributionItem[]; height?: number }) {
  if (!items.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
        Sem gastos categorizados nesta fatura.
      </div>
    )
  }

  const data = [{ name: 'credito', children: items.map((item) => ({ ...item, size: item.value })) }]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap data={data} dataKey="size" nameKey="name" animationDuration={350} content={<CreditTreemapNode />}>
        <Tooltip content={<ChartTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  )
}

function DistributionLegend({ items }: { items: CreditDistributionItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-3">
      {items.slice(0, 6).map((item) => (
        <div key={item.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs font-bold">
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 text-slate-900">{formatCurrencyBRL(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${total > 0 ? Math.max(3, item.percent) : 0}%`, backgroundColor: item.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CreditMonthDistributionCard({
  total,
  items,
  loading,
  onOpen,
}: {
  total: number
  items: CreditDistributionItem[]
  loading: boolean
  onOpen: () => void
}) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,1.15fr)_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">Gastos no credito este mes</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Distribuicao consolidada das faturas vigentes.</p>
            </div>
          </div>
          {loading ? <div className="mt-4 h-8 w-32 animate-pulse rounded-lg bg-slate-100" /> : <p className="mt-4 text-2xl font-extrabold text-slate-950">{formatCurrencyBRL(total)}</p>}
        </div>

        <div className="min-w-0">
          {loading ? (
            <div className="h-16 animate-pulse rounded-[14px] bg-slate-100" />
          ) : items.length ? (
            <div className="overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-4 w-full">
                {items.slice(0, 7).map((item) => (
                  <div key={item.id} title={`${item.name}: ${formatCurrencyBRL(item.value)}`} style={{ width: `${Math.max(4, item.percent)}%`, backgroundColor: item.color }} />
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">Sem gastos no credito neste mes.</p>
          )}
          {!loading && items.length > 0 && <div className="mt-3"><DistributionLegend items={items.slice(0, 4)} /></div>}
        </div>

        <button type="button" onClick={onOpen} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-200 hover:text-primary">
          Ver distribuicao
        </button>
      </div>
    </section>
  )
}

function CardFilterRail({
  sections,
  selectedCardId,
  cardColors,
  onSelect,
  onNewCard,
}: {
  sections: CardOwnerSection[]
  selectedCardId: string | null
  cardColors: Record<string, string>
  onSelect: (cardId: string) => void
  onNewCard: () => void
}) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.id} className="min-w-0">
            <p className="mb-2 px-1 text-[11px] font-extrabold tracking-[0.14em] text-slate-400">{section.label}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {section.cards.map((card) => {
                const accent = getCardAccentColor(card.id, cardColors)
                const active = selectedCardId === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onSelect(card.id)}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-extrabold transition-all ${active ? 'border-transparent text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]' : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300'}`}
                    style={active ? { backgroundColor: accent } : undefined}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: active ? '#fff' : accent }} />
                    {card.name}
                  </button>
                )
              })}
              <button type="button" onClick={onNewCard} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-blue-200 hover:text-primary" title="Novo cartao">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CreditPurchaseRow({
  item,
  charge,
  onEdit,
  onDelete,
}: {
  item: FutureItem
  charge?: CreditCardChargeItem | null
  onEdit: (charge: CreditCardChargeItem) => void
  onDelete: (charge: CreditCardChargeItem) => void
}) {
  const categoryName = item.category?.name ?? charge?.category?.name ?? 'Sem categoria'
  const categoryColor = getCategoryHexColor(item.category?.id ?? charge?.category?.id ?? categoryName, charge?.category?.color)

  return (
    <div className="grid gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 md:grid-cols-[1fr_1.4fr_0.65fr_0.8fr_0.8fr_34px] md:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} />
        <span className="truncate text-xs font-bold text-slate-600">{categoryName}</span>
      </div>
      <p className="truncate text-sm font-extrabold text-slate-900">{item.description ?? charge?.description ?? 'Sem descricao'}</p>
      <p className="text-xs font-bold text-slate-500">{installmentTableLabel(item.installmentNumber, item.installmentCount)}</p>
      <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ${forecastStatusBadge(item.status)}`}>{forecastStatusLabel(item.status)}</span>
      <p className="text-sm font-extrabold text-slate-950 md:text-right">{formatCurrencyBRL(item.amount)}</p>
      <Menu as="div" className="relative">
        <MenuButton className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <MoreHorizontal className="h-4 w-4" />
        </MenuButton>
        <MenuItems className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-xl outline-none">
          <MenuItem>
            {({ focus }) => (
              <button type="button" disabled={!charge} onClick={() => charge && onEdit(charge)} className={`w-full rounded-lg px-3 py-2 text-left font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}>Editar compra</button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button type="button" disabled={!charge} onClick={() => charge && onDelete(charge)} className={`w-full rounded-lg px-3 py-2 text-left font-medium disabled:cursor-not-allowed disabled:text-slate-300 ${focus ? 'bg-red-50 text-red-700' : 'text-red-600'}`}>Excluir</button>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  )
}

function InstallmentPlanRow({
  plan,
  onEdit,
  onDelete,
}: {
  plan: FutureInstallmentPlan
  onEdit: (plan: FutureInstallmentPlan) => void
  onDelete: (plan: FutureInstallmentPlan) => void
}) {
  const progress = getPlanProgress(plan)
  const status = normalizePlanStatus(plan.status ?? null)
  const monthly = getPlanMonthlyAmount(plan)

  return (
    <div className="grid gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 md:grid-cols-[1.2fr_0.75fr_0.9fr_0.9fr_0.8fr_34px] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-slate-900">{plan.description}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">Parcela {progress.installmentNumber} de {Number(plan.installmentCount || 1)}</p>
      </div>
      <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold ${status === 'active' ? 'bg-sky-100 text-sky-700' : status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{status === 'active' ? 'Ativo' : status === 'completed' ? 'Concluido' : 'Cancelado'}</span>
      <div><p className="text-sm font-extrabold text-slate-950">{formatCurrencyBRL(plan.totalAmount)}</p><p className="mt-1 text-xs font-medium text-slate-500">Total</p></div>
      <div><p className="text-sm font-extrabold text-slate-950">{formatDateShort(progress.nextDueDate)}</p><p className="mt-1 text-xs font-medium text-slate-500">Proximo vencimento</p></div>
      <div><p className="text-sm font-extrabold text-slate-950">{formatCurrencyBRL(monthly)}</p><p className="mt-1 text-xs font-medium text-slate-500">Por mes</p></div>
      <Menu as="div" className="relative">
        <MenuButton className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"><MoreHorizontal className="h-4 w-4" /></MenuButton>
        <MenuItems className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-xl outline-none">
          <MenuItem>{({ focus }) => <button type="button" onClick={() => onEdit(plan)} className={`w-full rounded-lg px-3 py-2 text-left font-medium ${focus ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}>Editar</button>}</MenuItem>
          <MenuItem>{({ focus }) => <button type="button" onClick={() => onDelete(plan)} className={`w-full rounded-lg px-3 py-2 text-left font-medium ${focus ? 'bg-red-50 text-red-700' : 'text-red-600'}`}>Excluir</button>}</MenuItem>
        </MenuItems>
      </Menu>
    </div>
  )
}

function SelectedCardHud({
  card,
  ownerLabel,
  cardColor,
  invoiceGroup,
  purchases,
  installments,
  distribution,
  loadingPurchases,
  payingStatement,
  onCreateCard,
  onCreateCharge,
  onManageCard,
  onPayStatement,
  onOpenPurchases,
  onOpenInstallments,
  onOpenHistory,
  onEditPurchase,
  onDeletePurchase,
  onEditPlan,
  onDeletePlan,
}: {
  card: CreditCardResponse | null
  ownerLabel?: string
  cardColor: string
  invoiceGroup: InvoiceGroup | null
  purchases: Array<{ item: FutureItem; charge?: CreditCardChargeItem | null }>
  installments: FutureInstallmentPlan[]
  distribution: CreditDistributionItem[]
  loadingPurchases: boolean
  payingStatement: boolean
  onCreateCard: () => void
  onCreateCharge: () => void
  onManageCard: (cardId?: string) => void
  onPayStatement: () => void
  onOpenPurchases: () => void
  onOpenInstallments: () => void
  onOpenHistory: () => void
  onEditPurchase: (charge: CreditCardChargeItem) => void
  onDeletePurchase: (charge: CreditCardChargeItem) => void
  onEditPlan: (plan: FutureInstallmentPlan) => void
  onDeletePlan: (plan: FutureInstallmentPlan) => void
}) {
  if (!card) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_14px_38px_rgba(15,23,42,0.04)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-primary"><WalletCards className="h-7 w-7" /></div>
        <h2 className="mt-5 text-base font-extrabold text-slate-950">Nenhum cartao ativo</h2>
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-500">Cadastre um cartao para acompanhar fatura, compras, parcelamentos e historico em uma unica HUD.</p>
        <button type="button" onClick={onCreateCard} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-extrabold text-white transition-colors hover:bg-secondary"><Plus className="h-4 w-4" />Novo cartao</button>
      </section>
    )
  }

  const statementStatus = getStatementDisplayStatus(invoiceGroup?.statement)
  const invoiceTotal = invoiceGroup?.totalAmount ?? 0
  const visiblePurchases = purchases.slice(0, 7)
  const visibleInstallments = installments.slice(0, 7)

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <article className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
          <div className="h-2" style={{ backgroundColor: cardColor }} />
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cardColor }} />
                <h2 className="truncate text-xl font-extrabold text-slate-950">{formatCardDisplayName(card)}</h2>
                {ownerLabel && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-500">{ownerLabel}</span>}
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${statementStatusBadge(statementStatus)}`}>{statementStatusLabel(statementStatus)}</span>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Fatura atual</p>
              <p className="mt-1 text-4xl font-extrabold tracking-normal text-slate-950">{formatCurrencyBRL(invoiceTotal)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <div className="rounded-[16px] bg-slate-50 px-4 py-3"><p className="text-[11px] font-bold text-slate-500">Vence</p><p className="mt-1 text-sm font-extrabold text-slate-950">{formatDateShort(invoiceGroup?.statement?.dueAt)}</p></div>
              <div className="rounded-[16px] bg-slate-50 px-4 py-3"><p className="text-[11px] font-bold text-slate-500">Fecha</p><p className="mt-1 text-sm font-extrabold text-slate-950">{formatDateShort(invoiceGroup?.statement?.closingAt)}</p></div>
              <div className="rounded-[16px] bg-slate-50 px-4 py-3"><p className="text-[11px] font-bold text-slate-500">Compras</p><p className="mt-1 text-sm font-extrabold text-slate-950">{purchases.length}</p></div>
              <div className="rounded-[16px] bg-slate-50 px-4 py-3"><p className="text-[11px] font-bold text-slate-500">Parcelas</p><p className="mt-1 text-sm font-extrabold text-slate-950">{installments.length}</p></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
            <button type="button" onClick={onCreateCharge} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-extrabold text-white transition-colors hover:bg-secondary"><Plus className="h-4 w-4" />Compra no credito</button>
            <button type="button" onClick={() => onManageCard(card.id)} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-200 hover:text-primary"><WalletCards className="h-4 w-4" />Gerenciar cartao</button>
            <button type="button" onClick={onOpenHistory} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-200 hover:text-primary"><BarChart3 className="h-4 w-4" />Ver historico</button>
            {invoiceGroup?.statement?.id && statementStatus !== 'paid' && (
              <button type="button" onClick={onPayStatement} disabled={payingStatement} className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{payingStatement ? 'Pagando...' : 'Pagar fatura'}</button>
            )}
          </div>
        </article>

        <div className="grid gap-4 2xl:grid-cols-2">
          <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div><h3 className="text-sm font-extrabold text-slate-950">Compras da fatura atual</h3><p className="mt-1 text-xs font-medium text-slate-500">Ate 7 compras recentes deste ciclo.</p></div>
              {purchases.length > 7 && <button type="button" onClick={onOpenPurchases} className="text-xs font-extrabold text-primary hover:text-secondary">Ver todas as {purchases.length}</button>}
            </div>
            {loadingPurchases ? (
              <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
            ) : visiblePurchases.length ? (
              visiblePurchases.map((purchase) => <CreditPurchaseRow key={purchase.item.id} item={purchase.item} charge={purchase.charge} onEdit={onEditPurchase} onDelete={onDeletePurchase} />)
            ) : (
              <div className="px-5 py-8 text-sm font-medium text-slate-500">Nenhuma compra nesta fatura.</div>
            )}
          </article>

          <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div><h3 className="text-sm font-extrabold text-slate-950">Parcelamentos</h3><p className="mt-1 text-xs font-medium text-slate-500">Planos vinculados a este cartao.</p></div>
              {installments.length > 7 && <button type="button" onClick={onOpenInstallments} className="text-xs font-extrabold text-primary hover:text-secondary">Ver todos os {installments.length}</button>}
            </div>
            {visibleInstallments.length ? (
              visibleInstallments.map((plan) => <InstallmentPlanRow key={plan.id} plan={plan} onEdit={onEditPlan} onDelete={onDeletePlan} />)
            ) : (
              <div className="px-5 py-8 text-sm font-medium text-slate-500">Nenhum parcelamento ativo neste cartao.</div>
            )}
          </article>
        </div>
      </div>

      <aside className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
        <div className="mb-4"><h3 className="text-sm font-extrabold text-slate-950">Distribuicao de gastos</h3><p className="mt-1 text-xs font-medium text-slate-500">O que esta consumindo a fatura selecionada.</p></div>
        <CreditDistributionChart items={distribution} height={260} />
        <div className="mt-5"><DistributionLegend items={distribution} /></div>
      </aside>
    </section>
  )
}

function CreditDistributionModal({
  open,
  title,
  items,
  onClose,
}: {
  open: boolean
  title: string
  items: CreditDistributionItem[]
  onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-4xl rounded-[24px] bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><DialogTitle className="text-lg font-extrabold text-slate-950">{title}</DialogTitle><p className="mt-1 text-sm font-medium text-slate-500">Distribuicao por categoria dos gastos no credito.</p></div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr]"><CreditDistributionChart items={items} height={380} /><DistributionLegend items={items} /></div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function PurchasesModal({
  open,
  purchases,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean
  purchases: Array<{ item: FutureItem; charge?: CreditCardChargeItem | null }>
  onClose: () => void
  onEdit: (charge: CreditCardChargeItem) => void
  onDelete: (charge: CreditCardChargeItem) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div><DialogTitle className="text-lg font-extrabold text-slate-950">Compras da fatura</DialogTitle><p className="mt-1 text-sm font-medium text-slate-500">Edite ou exclua compras do ciclo atual.</p></div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 overflow-y-auto">
            {purchases.length ? purchases.map((purchase) => <CreditPurchaseRow key={purchase.item.id} item={purchase.item} charge={purchase.charge} onEdit={onEdit} onDelete={onDelete} />) : <div className="px-6 py-10 text-center text-sm font-medium text-slate-500">Nenhuma compra nesta fatura.</div>}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function InstallmentPlansModal({
  open,
  plans,
  onClose,
  onEdit,
  onDelete,
  onOpenManagement,
}: {
  open: boolean
  plans: FutureInstallmentPlan[]
  onClose: () => void
  onEdit: (plan: FutureInstallmentPlan) => void
  onDelete: (plan: FutureInstallmentPlan) => void
  onOpenManagement: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div><DialogTitle className="text-lg font-extrabold text-slate-950">Gerenciamento de parcelamentos</DialogTitle><p className="mt-1 text-sm font-medium text-slate-500">Parcelamentos vinculados ao cartao selecionado.</p></div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 overflow-y-auto">
            {plans.length ? plans.map((plan) => <InstallmentPlanRow key={plan.id} plan={plan} onEdit={onEdit} onDelete={onDelete} />) : <div className="px-6 py-10 text-center text-sm font-medium text-slate-500">Nenhum parcelamento ativo neste cartao.</div>}
          </div>
          <div className="border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onOpenManagement} className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-white transition-colors hover:bg-secondary">Abrir gerenciamento completo</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function CardHistoryModal({
  open,
  title,
  data,
  onClose,
}: {
  open: boolean
  title: string
  data: Array<{ month: string; total: number }>
  onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-4xl rounded-[24px] bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><DialogTitle className="text-lg font-extrabold text-slate-950">{title}</DialogTitle><p className="mt-1 text-sm font-medium text-slate-500">Evolucao das faturas por ciclo.</p></div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          {data.length ? (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} width={86} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(value) => formatCurrencyBRL(Number(value)).replace(',00', '')} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => <Cell key={`${entry.month}-${index}`} fill={index % 2 === 0 ? '#0066A3' : '#0EA5E9'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">Historico indisponivel para este cartao.</div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function PayStatementConfirmModal({
  open,
  cardName,
  amount,
  dueAt,
  closingAt,
  confirming,
  onClose,
  onConfirm,
}: {
  open: boolean
  cardName: string
  amount: number
  dueAt?: string | null
  closingAt?: string | null
  confirming: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onClose={confirming ? () => undefined : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-950/35 backdrop-blur-[1px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-950">
                  Confirmar pagamento da fatura
                </DialogTitle>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Revise antes de marcar esta fatura como paga.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={confirming}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{cardName}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">{formatCurrencyBRL(amount)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] bg-white px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-500">Vencimento</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-950">{formatDateShort(dueAt)}</p>
                </div>
                <div className="rounded-[14px] bg-white px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-500">Fechamento</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-950">{formatDateShort(closingAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              As compras deste ciclo entram nas transacoes, as parcelas do mes ficam pagas e as parcelas futuras continuam abertas.
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CheckCircle2 className="h-4 w-4" />
              {confirming ? 'Confirmando...' : 'Confirmar pagamento'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default function FuturosPage() {
  const t = useTranslations('futurosPage')
  const locale = useLocale()
  const { user } = useUserSession()
  const { houseContext, currentUserId, scopeKey } = useFinancialScope()
  const currentUserName = user?.userData?.user?.name ?? user?.userData?.user?.email ?? ''
  const managementSectionRef = useRef<HTMLElement | null>(null)

  const planSchema = useMemo(() => buildPlanSchema(t), [t])
  const installmentEditSchema = useMemo(() => buildInstallmentEditSchema(t), [t])
  const paymentTypeOptions = useMemo(() => buildPaymentTypeOptions(t), [t])
  const statusOptions = useMemo(() => buildStatusOptions(t), [t])
  const typeOptions = useMemo(() => buildTypeOptions(t), [t])
  const planStatusOptions = useMemo(() => buildPlanStatusOptions(t), [t])
  const installmentEditableStatusOptions = useMemo(() => buildInstallmentEditableStatusOptions(t), [t])

  // ── Forecast state ──────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodOption>('30d')
  const [typeTab, setTypeTab] = useState<ForecastTab>('expense')
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [cardManagerOpen, setCardManagerOpen] = useState(false)
  const [cardManagerView, setCardManagerView] = useState<CreditCardManagerView>('list')
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [cardColors, setCardColors] = useState<Record<string, string>>(() =>
    readCreditCardColorMap()
  )
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [distributionModalOpen, setDistributionModalOpen] = useState(false)
  const [purchasesModalOpen, setPurchasesModalOpen] = useState(false)
  const [installmentPlansModalOpen, setInstallmentPlansModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [chargeDrawerOpen, setChargeDrawerOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<CreditCardChargeItem | null>(null)
  const [deleteChargeTarget, setDeleteChargeTarget] = useState<CreditCardChargeItem | null>(null)
  const [payStatementConfirmOpen, setPayStatementConfirmOpen] = useState(false)

  const toggleGroup = (key: string) => {
    setClosedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── CRUD state ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    type: '' as '' | FutureType,
    status: '' as '' | FutureStatus,
    page: 1,
    limit: 10,
  })
  const [planPage, setPlanPage] = useState(1)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [planModalMode, setPlanModalMode] = useState<'create' | 'edit'>('create')
  const [editingPlan, setEditingPlan] = useState<FutureInstallmentPlan | null>(null)
  const [deletePlanTarget, setDeletePlanTarget] = useState<FutureInstallmentPlan | null>(null)

  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<FutureInstallment | null>(null)
  const [installmentEditModalOpen, setInstallmentEditModalOpen] = useState(false)
  const [editingInstallment, setEditingInstallment] = useState<FutureInstallment | null>(null)
  const [deleteInstallmentTarget, setDeleteInstallmentTarget] = useState<FutureInstallment | null>(null)
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { categoriesQuery } = useCategories()
  const { cardQuery, payStatementMutation } = useCardMutations()
  const {
    createPlanMutation,
    updatePlanMutation,
    deletePlanMutation,
    settleInstallmentMutation,
    updateInstallmentMutation,
    deleteInstallmentMutation,
  } = useFutureMutations()

  const forecastParams = useMemo(() => {
    if (filters.from || filters.to) {
      return {
        from: filters.from || undefined,
        to: filters.to || undefined,
      }
    }
    return computeForecastParams(period)
  }, [filters.from, filters.to, period])
  const forecastQuery = useFutureForecast(forecastParams)
  const currentMonthForecastParams = useMemo(() => getCurrentMonthRange(), [])
  const currentMonthForecastQuery = useFutureForecast(currentMonthForecastParams)
  const {
    chargesQuery: selectedCardChargesQuery,
    deleteChargeMutation,
  } = useCreditCardCharges({
    cardId: selectedCardId ?? undefined,
    page: 1,
    limit: 300,
    enabled: Boolean(selectedCardId),
  })

  const plansQuery = useFuturePlans({
    from: filters.from || undefined,
    to: filters.to || undefined,
    type: filters.type || undefined,
    page: planPage,
    limit: 10,
  })

  const installmentsQuery = useFutureInstallments(
    {
      planId: selectedPlanId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      page: filters.page,
      limit: filters.limit,
    },
    { enabled: Boolean(selectedPlanId) }
  )

  const planTotalCheckQuery = useFutureInstallments(
    { planId: selectedPlanId || undefined, page: 1, limit: 300 },
    { enabled: Boolean(selectedPlanId) }
  )

  // ── Derived forecast data ────────────────────────────────────────────────────
  const upcoming = useMemo(
    () => (forecastQuery.data?.upcoming ?? []) as FutureItem[],
    [forecastQuery.data]
  )
  const filteredUpcoming = useMemo(
    () =>
      upcoming.filter((item) => {
        const matchesType =
          !filters.type ||
          item.type === filters.type ||
          (filters.type === 'EXPENSE' && item.sourceType === 'credit_card_statement_installment')
        const matchesStatus =
          !filters.status ||
          item.status === filters.status ||
          (filters.status === 'pending' && item.status === 'open')

        return matchesType && matchesStatus
      }),
    [filters.status, filters.type, upcoming]
  )
  const creditCardGroups = useMemo(() => groupCreditCardInvoices(filteredUpcoming), [filteredUpcoming])
  const allCreditCardGroups = useMemo(() => groupCreditCardInvoices(upcoming), [upcoming])

  const otherCommitments = useMemo(
    () =>
      filteredUpcoming
        .filter((i) => i.sourceType === 'installment_plan' && i.type !== 'INCOME')
        .sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ),
    [filteredUpcoming]
  )

  const incomeItems = useMemo(
    () =>
      filteredUpcoming
        .filter((i) => i.sourceType === 'installment_plan' && i.type === 'INCOME')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [filteredUpcoming]
  )

  const limitedOtherCommitments = useMemo(
    () => otherCommitments.slice(0, Math.max(1, Number(filters.limit || 10))),
    [filters.limit, otherCommitments]
  )

  const limitedIncomeItems = useMemo(
    () => incomeItems.slice(0, Math.max(1, Number(filters.limit || 10))),
    [filters.limit, incomeItems]
  )

  const hasExpenseItems = creditCardGroups.length > 0 || otherCommitments.length > 0
  const hasAnyForecastItem = filteredUpcoming.length > 0

  const cards = useMemo(
    () => (cardQuery.data ?? []).filter((card) => card.isActive !== false),
    [cardQuery.data]
  )
  const cardOwnerSections = useMemo(
    () => getCardOwnerSections({ cards, houseContext, currentUserId, currentUserName }),
    [cards, currentUserId, currentUserName, houseContext]
  )
  const currentMonthUpcoming = useMemo(
    () => (currentMonthForecastQuery.data?.upcoming ?? []) as FutureItem[],
    [currentMonthForecastQuery.data]
  )
  const currentMonthCreditGroups = useMemo(
    () => groupCreditCardInvoices(currentMonthUpcoming),
    [currentMonthUpcoming]
  )
  const creditInvoiceTotalThisMonth = useMemo(
    () => currentMonthCreditGroups.reduce((sum, group) => sum + Number(group.totalAmount || 0), 0),
    [currentMonthCreditGroups]
  )
  const incomeTotalThisMonth = currentMonthForecastQuery.data?.totals?.toReceive ?? 0
  const incomeCountThisMonth = currentMonthUpcoming.filter((item) => item.type === 'INCOME').length
  const creditInstallmentTotalThisMonth = useMemo(
    () =>
      currentMonthUpcoming
        .filter((item) => item.sourceType === 'installment_plan' && item.paymentType === 'CREDIT_CARD' && item.type !== 'INCOME' && isWithinCurrentMonth(item.dueDate))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [currentMonthUpcoming]
  )
  const activeCreditCardCount = cards.length
  const cardMetricsById = useMemo(
    () =>
      allCreditCardGroups.reduce<Record<string, CreditCardMetrics>>((acc, group) => {
        const cardId = group.card?.id
        if (!cardId) return acc

        const current = acc[cardId] ?? { openInvoices: 0, futureInstallments: 0 }
        acc[cardId] = {
          openInvoices: current.openInvoices + (group.statement?.status === 'open' ? 1 : 0),
          futureInstallments: current.futureInstallments + group.items.length,
        }
        return acc
      }, {}),
    [allCreditCardGroups]
  )

  useEffect(() => {
    if (!cards.length) {
      setSelectedCardId(null)
      return
    }
    if (selectedCardId && cards.some((card) => card.id === selectedCardId)) return
    setSelectedCardId(cards[0].id)
  }, [cards, scopeKey, selectedCardId])

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId]
  )
  const selectedCardOwnerLabel = useMemo(() => {
    if (!selectedCard) return undefined
    const section = cardOwnerSections.find((item) => item.cards.some((card) => card.id === selectedCard.id))
    return section?.label
  }, [cardOwnerSections, selectedCard])

  const selectedCardGroups = useMemo(
    () => allCreditCardGroups.filter((group) => group.card?.id === selectedCardId),
    [allCreditCardGroups, selectedCardId]
  )
  const selectedInvoiceGroup = useMemo(() => {
    if (!selectedCardGroups.length) return null
    return (
      selectedCardGroups.find((group) => getStatementDisplayStatus(group.statement) === 'open') ??
      selectedCardGroups.find((group) => getStatementDisplayStatus(group.statement) === 'invoiced') ??
      selectedCardGroups[0]
    )
  }, [selectedCardGroups])

  const selectedCardCharges = useMemo(
    () => selectedCardChargesQuery.data?.charges ?? [],
    [selectedCardChargesQuery.data?.charges]
  )
  const chargeByStatementInstallmentId = useMemo(() => {
    const map = new Map<string, CreditCardChargeItem>()
    selectedCardCharges.forEach((charge) => {
      map.set(charge.id, charge)
      charge.installments?.forEach((installment) => {
        map.set(installment.id, charge)
      })
    })
    return map
  }, [selectedCardCharges])
  const selectedInvoicePurchases = useMemo(
    () =>
      (selectedInvoiceGroup?.items ?? []).map((item) => ({
        item,
        charge: chargeByStatementInstallmentId.get(item.id) ?? null,
      })),
    [chargeByStatementInstallmentId, selectedInvoiceGroup?.items]
  )
  const selectedCardInstallmentPlans = useMemo(
    () =>
      (plansQuery.data?.plans ?? []).filter(
        (plan) =>
          normalizePlanStatus(plan.status ?? null) !== 'canceled' &&
          plan.paymentType === 'CREDIT_CARD' &&
          plan.cardId === selectedCardId
      ),
    [plansQuery.data?.plans, selectedCardId]
  )

  const selectedCardDistribution = useMemo(
    () =>
      buildCreditDistribution(
        selectedInvoicePurchases.map(({ item, charge }) => ({
          categoryId: item.category?.id ?? charge?.category?.id ?? null,
          categoryName: item.category?.name ?? charge?.category?.name ?? 'Sem categoria',
          categoryColor: charge?.category?.color ?? null,
          amount: Number(item.amount || 0),
        }))
      ),
    [selectedInvoicePurchases]
  )

  const monthCreditDistribution = useMemo(
    () =>
      buildCreditDistribution(
        currentMonthUpcoming
          .filter((item) => item.sourceType === 'credit_card_statement_installment')
          .map((item) => ({
            categoryId: item.category?.id ?? null,
            categoryName: item.category?.name ?? 'Sem categoria',
            amount: Number(item.amount || 0),
          }))
      ),
    [currentMonthUpcoming]
  )

  const selectedCardHistoryData = useMemo(() => {
    const map = new Map<string, number>()
    selectedCardCharges.forEach((charge) => {
      charge.installments?.forEach((installment) => {
        const key = installment.statementMonthKey || installment.statementDueAt?.slice(0, 7)
        if (!key) return
        map.set(key, (map.get(key) ?? 0) + Number(installment.amount || 0))
      })
    })
    if (map.size === 0) {
      selectedCardGroups.forEach((group) => {
        const key = group.statement?.cycleKey
        if (!key) return
        map.set(key, (map.get(key) ?? 0) + Number(group.totalAmount || 0))
      })
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month: formatCycleKey(month).replace('Fatura ', ''), total }))
  }, [selectedCardCharges, selectedCardGroups])

  useEffect(() => {
    if (forecastQuery.isLoading) return
    if (!hasExpenseItems && incomeItems.length > 0) {
      setTypeTab('income')
    }
  }, [forecastQuery.isLoading, hasExpenseItems, incomeItems.length])

  // ── Forms ────────────────────────────────────────────────────────────────────
  const {
    register: registerPlan,
    handleSubmit: handleSubmitPlan,
    reset: resetPlan,
    watch: watchPlan,
    formState: { errors: planErrors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      description: '',
      type: 'EXPENSE',
      paymentType: 'PIX',
      categoryId: '',
      cardId: '',
      totalAmount: 0,
      installmentCount: 1,
      intervalMonths: 1,
      firstDueDate: '',
      status: 'active',
      recalculateRemaining: true,
      notes: '',
    },
  })

  const {
    register: registerSettle,
    handleSubmit: handleSubmitSettle,
    reset: resetSettle,
    formState: { errors: settleErrors },
  } = useForm<SettleFormData>({
    resolver: zodResolver(settleSchema),
    defaultValues: { amount: '', paidAt: '' },
  })

  const {
    register: registerInstallmentEdit,
    handleSubmit: handleSubmitInstallmentEdit,
    reset: resetInstallmentEdit,
    formState: { errors: installmentEditErrors },
  } = useForm<InstallmentEditFormData>({
    resolver: zodResolver(installmentEditSchema),
    defaultValues: { amount: 0, dueDate: '', status: 'pending', recalculateRemaining: true },
  })

  const watchedAmount = Number(watchPlan('totalAmount') || 0)
  const watchedCount = Number(watchPlan('installmentCount') || 1)
  const watchedPaymentType = watchPlan('paymentType')

  const approximateInstallmentValue = useMemo(
    () => (watchedAmount && watchedCount ? watchedAmount / watchedCount : 0),
    [watchedAmount, watchedCount]
  )

  // ── Derived CRUD data ────────────────────────────────────────────────────────
  const plans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data?.plans])
  const visiblePlans = useMemo(
    () => plans.filter((p) => normalizePlanStatus(p.status ?? null) !== 'canceled'),
    [plans]
  )
  const plansMeta = plansQuery.data?.meta

  const planTotalPages = useMemo(() => {
    if (!plansMeta) return 1
    if (plansMeta.total > 0) return Math.max(1, Math.ceil(plansMeta.total / Math.max(plansMeta.limit || 1, 1)))
    if (plansMeta.hasNext) return plansMeta.page + 1
    return 1
  }, [plansMeta])

  const selectedPlan = useMemo(
    () => visiblePlans.find((p) => p.id === selectedPlanId) ?? null,
    [visiblePlans, selectedPlanId]
  )

  useEffect(() => {
    if (!selectedPlanId) return
    if (visiblePlans.some((p) => p.id === selectedPlanId)) return
    setSelectedPlanId(null)
  }, [visiblePlans, selectedPlanId])

  const installments = installmentsQuery.data?.installments ?? []
  const installmentsMeta = installmentsQuery.data?.meta
  const installmentTotalPages = useMemo(() => {
    if (!installmentsMeta) return 1
    if (installmentsMeta.total > 0)
      return Math.max(1, Math.ceil(installmentsMeta.total / Math.max(installmentsMeta.limit || 1, 1)))
    if (installmentsMeta.hasNext) return installmentsMeta.page + 1
    return 1
  }, [installmentsMeta])

  const planTotalCheckInstallments = useMemo(
    () => planTotalCheckQuery.data?.installments ?? [],
    [planTotalCheckQuery.data?.installments]
  )
  const planTotalCheckMeta = planTotalCheckQuery.data?.meta
  const planInstallmentsSum = useMemo(
    () => roundCurrency(planTotalCheckInstallments.reduce((sum, i) => sum + Number(i.amount || 0), 0)),
    [planTotalCheckInstallments]
  )
  const canComparePlanTotal = useMemo(() => {
    if (!selectedPlan || !planTotalCheckMeta) return false
    return Number(planTotalCheckMeta.total || 0) <= planTotalCheckInstallments.length
  }, [selectedPlan, planTotalCheckMeta, planTotalCheckInstallments.length])

  const planTotalDifference = useMemo(() => {
    if (!selectedPlan || !canComparePlanTotal) return 0
    return roundCurrency(planInstallmentsSum - Number(selectedPlan.totalAmount || 0))
  }, [selectedPlan, canComparePlanTotal, planInstallmentsSum])

  const hasPlanTotalMismatch = canComparePlanTotal && Math.abs(planTotalDifference) >= 0.01

  const loadingCards = forecastQuery.isLoading
  const loadingPlans = plansQuery.isLoading
  const loadingInstallments = installmentsQuery.isLoading
  const hasError = plansQuery.isError || (Boolean(selectedPlanId) && installmentsQuery.isError)
  const errorMessage =
    (plansQuery.error as Error | undefined)?.message ||
    (installmentsQuery.error as Error | undefined)?.message ||
    t('errors.loadFutures')
  const isSavingPlan = createPlanMutation.isPending || updatePlanMutation.isPending

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const persistCardColors = (next: Record<string, string>) => {
    setCardColors(next)
    writeCreditCardColorMap(next)
  }

  const openCardManagerList = () => {
    setEditingCardId(null)
    setCardManagerView('list')
    setCardManagerOpen(true)
  }

  const openNewCardForm = () => {
    setEditingCardId(null)
    setCardManagerView('form')
    setCardManagerOpen(true)
  }

  const openEditCardForm = (cardId?: string) => {
    setEditingCardId(cardId ?? selectedCardId)
    setCardManagerView('form')
    setCardManagerOpen(true)
  }

  const openInstallmentsManagement = () => {
    setShowManagement(true)
    setInstallmentPlansModalOpen(false)
    window.setTimeout(() => {
      managementSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const openChargeDrawer = (charge?: CreditCardChargeItem | null) => {
    setEditingCharge(charge ?? null)
    setChargeDrawerOpen(true)
  }

  const closeChargeDrawer = () => {
    setChargeDrawerOpen(false)
    setEditingCharge(null)
  }

  const handleCardColorSaved = (cardId: string, color: string) => {
    persistCardColors({ ...cardColors, [cardId]: color })
  }

  const handleCardRemoved = (cardId: string) => {
    const next = { ...cardColors }
    delete next[cardId]
    persistCardColors(next)
  }

  const onDeleteCharge = async () => {
    if (!deleteChargeTarget?.id) return
    try {
      await deleteChargeMutation.mutateAsync(deleteChargeTarget.id)
      setDeleteChargeTarget(null)
      toast.success('Compra excluida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir compra.')
    }
  }

  const requestPaySelectedStatement = () => {
    if (!selectedInvoiceGroup?.statement?.id) return
    setPayStatementConfirmOpen(true)
  }

  const confirmPaySelectedStatement = async () => {
    const statementId = selectedInvoiceGroup?.statement?.id
    if (!statementId) return

    try {
      await payStatementMutation.mutateAsync({
        statementId,
        data: { paidAt: new Date().toISOString() },
      })
      setPayStatementConfirmOpen(false)
      toast.success('Fatura marcada como paga')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao pagar fatura.')
    }
  }

  const openCreatePlanModal = () => {
    setPlanModalMode('create')
    setEditingPlan(null)
    resetPlan({
      description: '', type: 'EXPENSE', paymentType: 'PIX', categoryId: '', cardId: '',
      totalAmount: 0, installmentCount: 1, intervalMonths: 1, firstDueDate: '',
      status: 'active', recalculateRemaining: true, notes: '',
    })
    setPlanModalOpen(true)
  }

  const openEditPlanModal = (plan: FutureInstallmentPlan) => {
    setPlanModalMode('edit')
    setEditingPlan(plan)
    resetPlan({
      description: plan.description ?? '',
      type: plan.type,
      paymentType: plan.paymentType,
      categoryId: plan.categoryId ?? '',
      cardId: plan.cardId ?? '',
      totalAmount: Number(plan.totalAmount || 0),
      installmentCount: Number(plan.installmentCount || 1),
      intervalMonths: Number(plan.intervalMonths || 1),
      firstDueDate: toDateInput(plan.firstDueDate),
      status: normalizePlanStatus(plan.status ?? null),
      recalculateRemaining: true,
      notes: plan.notes ?? '',
    })
    setPlanModalOpen(true)
  }

  const closePlanModal = () => {
    setPlanModalOpen(false)
    setEditingPlan(null)
    setPlanModalMode('create')
    resetPlan()
  }

  const onSavePlan = async (data: PlanFormData) => {
    setActionError(null)
    try {
      const basePayload = {
        description: data.description.trim(),
        type: data.type,
        paymentType: data.paymentType,
        categoryId: data.categoryId?.trim() ? data.categoryId : null,
        cardId: data.paymentType === 'CREDIT_CARD' && data.cardId?.trim() ? data.cardId : null,
        totalAmount: data.totalAmount,
        installmentCount: data.installmentCount,
        firstDueDate: toIsoFromDateInput(data.firstDueDate) || new Date().toISOString(),
        intervalMonths: data.intervalMonths || 1,
        notes: data.notes?.trim() ? data.notes.trim() : null,
      }
      if (planModalMode === 'edit' && editingPlan?.id) {
        await updatePlanMutation.mutateAsync({
          id: editingPlan.id,
          payload: { ...basePayload, status: data.status ?? 'active', recalculateRemaining: data.recalculateRemaining ?? true },
        })
      } else {
        await createPlanMutation.mutateAsync(basePayload)
      }
      closePlanModal()
      toast.success(planModalMode === 'edit' ? t('toasts.planUpdated') : t('toasts.planCreated'))
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('toasts.planSaveError')
      const message = mapFutureDomainError(raw, t)
      setActionError(message)
      toast.error(message)
    }
  }

  const onDeletePlan = async () => {
    if (!deletePlanTarget?.id) return
    setActionError(null)
    try {
      await deletePlanMutation.mutateAsync(deletePlanTarget.id)
      if (selectedPlanId === deletePlanTarget.id) setSelectedPlanId(null)
      setDeletePlanTarget(null)
      toast.success(t('toasts.planDeleted'))
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('toasts.planDeleteError')
      const message = mapFutureDomainError(raw, t)
      setActionError(message)
      toast.error(message)
    }
  }

  const openEditInstallmentModal = (installment: FutureInstallment) => {
    setEditingInstallment(installment)
    resetInstallmentEdit({
      amount: Number(installment.amount || 0),
      dueDate: toDateInput(installment.dueDate),
      status: installment.status === 'canceled' ? 'canceled' : 'pending',
      recalculateRemaining: true,
    })
    setInstallmentEditModalOpen(true)
  }

  const closeInstallmentEditModal = () => {
    setInstallmentEditModalOpen(false)
    setEditingInstallment(null)
    resetInstallmentEdit()
  }

  const onSaveInstallment = async (data: InstallmentEditFormData) => {
    if (!editingInstallment?.id) return
    setActionError(null)
    try {
      await updateInstallmentMutation.mutateAsync({
        id: editingInstallment.id,
        payload: {
          amount: data.amount,
          dueDate: toIsoFromDateInput(data.dueDate),
          status: data.status,
          recalculateRemaining: data.recalculateRemaining ?? true,
        },
      })
      closeInstallmentEditModal()
      toast.success(t('toasts.installmentUpdated'))
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('toasts.installmentUpdateError')
      const message = mapFutureDomainError(raw, t)
      setActionError(message)
      toast.error(message)
    }
  }

  const onDeleteInstallment = async () => {
    if (!deleteInstallmentTarget?.id) return
    setActionError(null)
    try {
      await deleteInstallmentMutation.mutateAsync(deleteInstallmentTarget.id)
      setDeleteInstallmentTarget(null)
      toast.success(t('toasts.installmentDeleted'))
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('toasts.installmentDeleteError')
      const message = mapFutureDomainError(raw, t)
      setActionError(message)
      toast.error(message)
    }
  }

  const openSettleModal = (installment: FutureInstallment) => {
    setSelectedInstallment(installment)
    resetSettle({ amount: '', paidAt: toDateInput(new Date().toISOString()) })
    setSettleModalOpen(true)
  }

  const closeSettleModal = () => {
    setSettleModalOpen(false)
    setSelectedInstallment(null)
    resetSettle()
  }

  const onSettle = async (data: SettleFormData) => {
    if (!selectedInstallment?.id) return
    const rawAmount = data.amount?.trim()
    const normalizedAmount = rawAmount ? rawAmount.replace(/\./g, '').replace(',', '.') : ''
    const parsedAmount = Number(normalizedAmount)
    const amount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined
    setActionError(null)
    try {
      await settleInstallmentMutation.mutateAsync({
        id: selectedInstallment.id,
        body: { amount, paidAt: data.paidAt ? toIsoFromDateInput(data.paidAt) : undefined },
      })
      closeSettleModal()
      toast.success(t('toasts.settleSuccess'))
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('toasts.settleError')
      const message = mapFutureDomainError(raw, t)
      setActionError(message)
      toast.error(message)
    }
  }

  const onSyncPlanTotalWithInstallments = async () => {
    if (!selectedPlan?.id || !canComparePlanTotal || !hasPlanTotalMismatch) return
    setActionError(null)
    setSyncingPlanId(selectedPlan.id)
    try {
      await updatePlanMutation.mutateAsync({
        id: selectedPlan.id,
        payload: { totalAmount: planInstallmentsSum, recalculateRemaining: false },
      })
      toast.success(t('toasts.syncSuccess'))
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('toasts.syncError')
      const message = mapFutureDomainError(raw, t)
      setActionError(message)
      toast.error(message)
    } finally {
      setSyncingPlanId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const filtersPanel = (
    <section className="rounded-[20px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Filtros</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Refine periodo, tipo e status sem sair da central.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(false)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          aria-label="Fechar filtros"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 items-end gap-3 pt-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-600">{t('filters.from')}</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => {
              setPlanPage(1)
              setFilters((p) => ({ ...p, from: e.target.value, page: 1 }))
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-600">{t('filters.to')}</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              setPlanPage(1)
              setFilters((p) => ({ ...p, to: e.target.value, page: 1 }))
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-600">{t('filters.type')}</span>
          <select
            value={filters.type}
            onChange={(e) => {
              setPlanPage(1)
              setFilters((p) => ({ ...p, type: e.target.value as '' | FutureType, page: 1 }))
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary"
          >
            {typeOptions.map((opt) => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-600">{t('filters.installmentStatus')}</span>
          <select
            value={filters.status}
            onChange={(e) => {
              setPlanPage(1)
              setFilters((p) => ({ ...p, status: e.target.value as '' | FutureStatus, page: 1 }))
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary"
          >
            {statusOptions.map((opt) => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-600">{t('filters.installmentsPerPage')}</span>
          <select
            value={filters.limit}
            onChange={(e) => {
              setPlanPage(1)
              setFilters((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary"
          >
            {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPlanPage(1)
            setFilters({ from: '', to: '', type: '', status: '', page: 1, limit: 10 })
          }}
          className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-200 hover:text-primary"
        >
          Limpar
        </button>
      </div>
    </section>
  )

  return (
    <section className="min-h-full w-full bg-[#F6F9FC] px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary shadow-[0_12px_26px_rgba(0,102,163,0.10)]">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-normal text-slate-950">Futuros</h1>
                <FinancialScopeSwitcher />
              </div>
              <p className="mt-2 text-sm font-extrabold text-slate-700">
                Central de gestao de cartoes, faturas, compras no credito e parcelamentos.
              </p>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
                Troque de cartao no filtro superior e acompanhe a HUD sem multiplicar containers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              onClick={() => openChargeDrawer(null)}
              className="h-12 w-auto rounded-full px-5 text-sm font-extrabold shadow-[0_14px_28px_rgba(0,102,163,0.24)]"
            >
              <CreditCard className="h-4 w-4" />
              Compra no credito
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openCreatePlanModal}
              className="h-12 w-auto rounded-full px-5 text-sm font-extrabold"
            >
              <Plus className="h-4 w-4" />
              transação futura
            </Button>
          </div>
        </header>

        <div className="relative z-40 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p)
                  setFilters((prev) => ({ ...prev, from: '', to: '', page: 1 }))
                  setPlanPage(1)
                }}
                className={`h-10 rounded-full border px-5 text-sm font-extrabold shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-colors ${
                  period === p && !filters.from && !filters.to
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex h-10 w-fit items-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-colors ${
              showFilters
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-primary'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-50 max-h-[calc(100vh-180px)] overflow-y-auto">
              {filtersPanel}
            </div>
          )}
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="A pagar"
            value={formatCurrencyBRL(creditInvoiceTotalThisMonth)}
            subtext={`${activeCreditCardCount} ${activeCreditCardCount === 1 ? 'cartao' : 'cartoes'}`}
            icon={ArrowDownRight}
            tone="red"
            loading={currentMonthForecastQuery.isLoading}
          />
          <SummaryCard
            title="A receber"
            value={formatCurrencyBRL(incomeTotalThisMonth)}
            subtext={incomeCountThisMonth > 0 ? `${incomeCountThisMonth} entradas futuras` : 'Entradas futuras'}
            icon={ArrowUpRight}
            tone="green"
            loading={currentMonthForecastQuery.isLoading}
          />
          <SummaryCard
            title="Cartao de credito"
            value={activeCreditCardCount}
            subtext="Gerenciar cartoes"
            icon={WalletCards}
            tone="blue"
            loading={cardQuery.isLoading}
            onClick={openCardManagerList}
          />
          <SummaryCard
            title="Parcelamentos"
            value={formatCurrencyBRL(creditInstallmentTotalThisMonth)}
            subtext={`As parcelas dos seus cartoes somam ${formatCurrencyBRL(creditInstallmentTotalThisMonth)} este mes.`}
            icon={LayoutGrid}
            tone="purple"
            loading={currentMonthForecastQuery.isLoading}
            onClick={openInstallmentsManagement}
          />
        </section>

        <CreditMonthDistributionCard
          total={creditInvoiceTotalThisMonth}
          items={monthCreditDistribution}
          loading={currentMonthForecastQuery.isLoading}
          onOpen={() => setDistributionModalOpen(true)}
        />

        <CardFilterRail
          sections={cardOwnerSections}
          selectedCardId={selectedCardId}
          cardColors={cardColors}
          onSelect={setSelectedCardId}
          onNewCard={openNewCardForm}
        />

        <SelectedCardHud
          card={selectedCard}
          ownerLabel={selectedCardOwnerLabel}
          cardColor={getCardAccentColor(selectedCard?.id, cardColors)}
          invoiceGroup={selectedInvoiceGroup}
          purchases={selectedInvoicePurchases}
          installments={selectedCardInstallmentPlans}
          distribution={selectedCardDistribution}
          loadingPurchases={selectedCardChargesQuery.isLoading}
          payingStatement={payStatementMutation.isPending}
          onCreateCard={openNewCardForm}
          onCreateCharge={() => openChargeDrawer(null)}
          onManageCard={openEditCardForm}
          onPayStatement={requestPaySelectedStatement}
          onOpenPurchases={() => setPurchasesModalOpen(true)}
          onOpenInstallments={() => setInstallmentPlansModalOpen(true)}
          onOpenHistory={() => setHistoryModalOpen(true)}
          onEditPurchase={openChargeDrawer}
          onDeletePurchase={setDeleteChargeTarget}
          onEditPlan={openEditPlanModal}
          onDeletePlan={setDeletePlanTarget}
        />

        {forecastQuery.isError && (
          <div className="flex flex-col gap-3 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>Erro ao carregar previsão. Verifique sua conexão.</span>
            <button
              type="button"
              onClick={() => forecastQuery.refetch()}
              className="w-fit rounded-full border border-red-300 px-3 py-1 text-xs font-extrabold hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {false && (loadingCards ? (
          <ForecastSkeleton />
        ) : !hasAnyForecastItem ? (
          <>
            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  Faturas de cartão de crédito
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openNewCardForm}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,163,0.18)] transition-colors hover:bg-secondary"
                  >
                    <Plus className="h-4 w-4" />
                    Novo cartão
                  </button>
                  <button
                    type="button"
                    onClick={openCardManagerList}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-colors hover:border-blue-200 hover:text-primary"
                  >
                    <WalletCards className="h-4 w-4" />
                    Gerenciar cartões
                  </button>
                </div>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-6 text-sm font-medium text-slate-500 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                Nenhuma fatura de cartão neste período.
              </div>
            </section>
            <ForecastEmptyState onCreate={openCreatePlanModal} />
          </>
        ) : (
          <>
            <ForecastTabs active={typeTab} onChange={setTypeTab} />

            {typeTab === 'expense' ? (
              <div className="space-y-5">
                <section className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <CreditCard className="h-4 w-4 text-slate-500" />
                      Faturas de cartão de crédito
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openNewCardForm}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,102,163,0.18)] transition-colors hover:bg-secondary"
                      >
                        <Plus className="h-4 w-4" />
                        Novo cartão
                      </button>
                      <button
                        type="button"
                        onClick={openCardManagerList}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-colors hover:border-blue-200 hover:text-primary"
                      >
                        <WalletCards className="h-4 w-4" />
                        Gerenciar cartões
                      </button>
                    </div>
                  </div>
                  {creditCardGroups.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {creditCardGroups.map((group) => {
                        const key = getInvoiceGroupKey(group)
                        return (
                          <InvoiceGroupAccordion
                            key={key}
                            group={group}
                            groupKey={key}
                            isOpen={!closedGroups.has(key)}
                            onToggle={toggleGroup}
                            cardColor={getCardAccentColor(group.card?.id, cardColors)}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-6 text-sm font-medium text-slate-500 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                      Nenhuma fatura de cartão neste período.
                    </div>
                  )}
                </section>

                {otherCommitments.length > 0 ? (
                  <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      <h2 className="text-sm font-extrabold text-slate-900">Outros compromissos futuros</h2>
                    </div>
                    {limitedOtherCommitments.map((item) => (
                      <CommitmentCard
                        key={item.id}
                        item={item}
                        onSettle={openSettleModal}
                        onEdit={openEditInstallmentModal}
                        onDelete={setDeleteInstallmentTarget}
                      />
                    ))}
                    {otherCommitments.length > limitedOtherCommitments.length && (
                      <div className="border-t border-slate-100 px-5 py-3 text-center text-xs font-extrabold text-primary">
                        Exibindo {limitedOtherCommitments.length} de {otherCommitments.length} compromissos
                      </div>
                    )}
                  </section>
                ) : creditCardGroups.length === 0 ? (
                  <p className="rounded-[18px] border border-slate-200 bg-white px-5 py-6 text-sm font-medium text-slate-500">
                    Nenhum outro compromisso futuro neste período.
                  </p>
                ) : null}
              </div>
            ) : (
              <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                  <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">Receitas futuras</h2>
                </div>
                {incomeItems.length > 0 ? (
                  <>
                    {limitedIncomeItems.map((item) => (
                      <CommitmentCard
                        key={item.id}
                        item={item}
                        onSettle={openSettleModal}
                        onEdit={openEditInstallmentModal}
                        onDelete={setDeleteInstallmentTarget}
                      />
                    ))}
                    {incomeItems.length > limitedIncomeItems.length && (
                      <div className="border-t border-slate-100 px-5 py-3 text-center text-xs font-extrabold text-primary">
                        Exibindo {limitedIncomeItems.length} de {incomeItems.length} receitas
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-5 py-8 text-sm font-medium text-slate-500">
                    Nenhuma receita futura neste período.
                  </div>
                )}
              </section>
            )}
          </>
        ))}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MANAGEMENT SECTION */}
      {/* ────────────────────────────────────────────────────────────────────── */}

        <section ref={managementSectionRef} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={() => setShowManagement((prev) => !prev)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Gerenciamento de parcelamentos</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Edição, baixa e exclusão continuam disponíveis em uma área secundária.</p>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${showManagement ? 'rotate-180' : ''}`} />
          </button>

          {showManagement && (
            <div className="mt-4 space-y-4">

      {(hasError || actionError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {hasError ? errorMessage : actionError}
        </div>
      )}

      {/* Plans table */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-semibold text-gray-800">{t('plans.title')}</h3>
          <span className="text-xs text-gray-500">{t('plans.activeCount', { count: visiblePlans.length })}</span>
        </div>
        {loadingPlans ? (
          <Skeleton type="table" rows={6} />
        ) : visiblePlans.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">{t('plans.noResults')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 pr-3">{t('tablePlans.description')}</th>
                    <th className="py-3 pr-3">{t('tablePlans.type')}</th>
                    <th className="py-3 pr-3">{t('tablePlans.installments')}</th>
                    <th className="py-3 pr-3">{t('tablePlans.total')}</th>
                    <th className="py-3 pr-3">{t('tablePlans.firstDueDate')}</th>
                    <th className="py-3 pr-3">{t('tablePlans.interval')}</th>
                    <th className="py-3 pr-3 text-right">{t('tablePlans.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlans.map((plan) => {
                    const selected = selectedPlanId === plan.id
                    const isSyncingThisPlan = syncingPlanId === plan.id
                    const selectedRowShowsMismatch = selected && hasPlanTotalMismatch
                    return (
                      <tr
                        key={plan.id}
                        className={`border-b border-gray-100 ${selected ? 'bg-sky-50/60' : ''} ${selectedRowShowsMismatch ? 'bg-amber-50/70' : ''}`}
                      >
                        <td className="py-3 pr-3 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <span>{plan.description}</span>
                            {selectedRowShowsMismatch && (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                {t('badges.mismatch')}
                              </span>
                            )}
                            {isSyncingThisPlan && (
                              <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                {t('badges.syncing')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3">{plan.type === 'EXPENSE' ? t('labels.expense') : t('labels.income')}</td>
                        <td className="py-3 pr-3">{t('labels.installmentCount', { count: Number(plan.installmentCount || 0) })}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span className={selectedRowShowsMismatch ? 'font-semibold text-amber-800' : ''}>
                              {formatBRL(plan.totalAmount)}
                            </span>
                            {selected && (
                              planTotalCheckQuery.isLoading ? (
                                <span className="text-[11px] text-gray-400">{t('labels.summingInstallments')}</span>
                              ) : canComparePlanTotal ? (
                                <span className={`text-[11px] ${hasPlanTotalMismatch ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {t('labels.installmentsSum')}: {formatBRL(planInstallmentsSum)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">{t('labels.partialSum')}</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3">{formatDateByLocale(plan.firstDueDate, locale)}</td>
                        <td className="py-3 pr-3">{t('labels.monthInterval', { count: Number(plan.intervalMonths || 0) })}</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setSelectedPlanId(plan.id); setFilters((p) => ({ ...p, page: 1 })) }}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${selected ? 'border-primary text-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                              <Eye size={13} />
                              {t('buttons.installments')}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditPlanModal(plan)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={13} />
                              {t('buttons.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePlanTarget(plan)}
                              className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                              {t('buttons.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {planTotalPages > 1 && (
              <div className="pt-4">
                <Pagination currentPage={planPage} totalPages={planTotalPages} onChange={setPlanPage} />
              </div>
            )}
          </>
        )}
      </section>

      {/* Installments table */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-semibold text-gray-800">
            {selectedPlan
              ? t('installments.titleWithPlan', { description: selectedPlan.description })
              : t('installments.title')}
          </h3>
          {selectedPlan && (
            <button
              type="button"
              onClick={() => setSelectedPlanId(null)}
              className="text-xs rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50"
            >
              {t('buttons.closeDetails')}
            </button>
          )}
        </div>

        {selectedPlan && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-xs ${hasPlanTotalMismatch ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-gray-700">{t('labels.planTotal')}: <strong>{formatBRL(selectedPlan.totalAmount)}</strong></span>
              <span className="text-gray-700">{t('labels.installmentsTotal')}: <strong>{planTotalCheckQuery.isLoading ? '...' : formatBRL(planInstallmentsSum)}</strong></span>
              {canComparePlanTotal ? (
                <span className={hasPlanTotalMismatch ? 'text-amber-800' : 'text-emerald-700'}>
                  {t('labels.difference')}: <strong>{formatBRL(planTotalDifference)}</strong>
                </span>
              ) : (
                <span className="text-gray-500">{t('labels.noComparisonBase')}</span>
              )}
              {hasPlanTotalMismatch && (
                <button
                  type="button"
                  onClick={onSyncPlanTotalWithInstallments}
                  disabled={syncingPlanId === selectedPlan.id || updatePlanMutation.isPending}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncingPlanId === selectedPlan.id ? t('buttons.syncingTotal') : t('buttons.syncPlanTotal')}
                </button>
              )}
            </div>
          </div>
        )}

        {!selectedPlanId ? (
          <div className="py-10 text-center text-sm text-gray-500">{t('installments.selectPlan')}</div>
        ) : loadingInstallments ? (
          <Skeleton type="table" rows={8} />
        ) : installments.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">{t('installments.noResults')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 pr-3">{t('tableInstallments.description')}</th>
                    <th className="py-3 pr-3">{t('tableInstallments.type')}</th>
                    <th className="py-3 pr-3">{t('tableInstallments.installment')}</th>
                    <th className="py-3 pr-3">{t('tableInstallments.value')}</th>
                    <th className="py-3 pr-3">{t('tableInstallments.dueDate')}</th>
                    <th className="py-3 pr-3">{t('tableInstallments.status')}</th>
                    <th className="py-3 pr-3 text-right">{t('tableInstallments.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((item) => {
                    const effectiveStatus = calcEffectiveStatus(item)
                    const canSettle = effectiveStatus === 'pending' || effectiveStatus === 'overdue'
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3 text-gray-800">{item.description}</td>
                        <td className="py-3 pr-3">{item.type === 'EXPENSE' ? t('labels.expense') : t('labels.income')}</td>
                        <td className="py-3 pr-3">{item.installmentNumber}/{item.installmentCount}</td>
                        <td className="py-3 pr-3 font-medium">{formatBRL(item.amount)}</td>
                        <td className="py-3 pr-3">{formatDateByLocale(item.dueDate, locale)}</td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(effectiveStatus)}`}>
                            {statusLabel(effectiveStatus, t)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {canSettle && (
                              <button
                                type="button"
                                onClick={() => openSettleModal(item)}
                                className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                              >
                                <CheckCircle2 size={14} />
                                {t('buttons.settle')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditInstallmentModal(item)}
                              disabled={effectiveStatus === 'settled'}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil size={13} />
                              {t('buttons.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteInstallmentTarget(item)}
                              disabled={effectiveStatus === 'settled'}
                              className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              {t('buttons.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="pt-4">
              <Pagination
                currentPage={filters.page}
                totalPages={installmentTotalPages}
                onChange={(page) => setFilters((p) => ({ ...p, page }))}
              />
            </div>
          </>
        )}
      </section>

            </div>
          )}
        </section>
      </div>

      <CreditCardManagerDrawer
        open={cardManagerOpen}
        view={cardManagerView}
        editingCardId={editingCardId}
        cards={cardQuery.data ?? []}
        cardColors={cardColors}
        metricsByCardId={cardMetricsById}
        onViewChange={setCardManagerView}
        onEditingCardIdChange={setEditingCardId}
        onColorSaved={handleCardColorSaved}
        onCardRemoved={handleCardRemoved}
        onClose={() => setCardManagerOpen(false)}
      />

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}

      <CreditCardChargeDrawer
        open={chargeDrawerOpen}
        onClose={closeChargeDrawer}
        initialData={editingCharge ?? undefined}
        initialCardId={selectedCardId}
      />

      <CreditDistributionModal
        open={distributionModalOpen}
        title="Gastos no credito este mes"
        items={monthCreditDistribution}
        onClose={() => setDistributionModalOpen(false)}
      />

      <PurchasesModal
        open={purchasesModalOpen}
        purchases={selectedInvoicePurchases}
        onClose={() => setPurchasesModalOpen(false)}
        onEdit={(charge) => {
          setPurchasesModalOpen(false)
          openChargeDrawer(charge)
        }}
        onDelete={setDeleteChargeTarget}
      />

      <InstallmentPlansModal
        open={installmentPlansModalOpen}
        plans={selectedCardInstallmentPlans}
        onClose={() => setInstallmentPlansModalOpen(false)}
        onEdit={(plan) => {
          setInstallmentPlansModalOpen(false)
          openEditPlanModal(plan)
        }}
        onDelete={setDeletePlanTarget}
        onOpenManagement={openInstallmentsManagement}
      />

      <CardHistoryModal
        open={historyModalOpen}
        title={selectedCard ? `Historico do ${selectedCard.name}` : 'Historico do cartao'}
        data={selectedCardHistoryData}
        onClose={() => setHistoryModalOpen(false)}
      />

      <PayStatementConfirmModal
        open={payStatementConfirmOpen}
        cardName={selectedCard ? formatCardDisplayName(selectedCard) : 'Cartao'}
        amount={selectedInvoiceGroup?.totalAmount ?? 0}
        dueAt={selectedInvoiceGroup?.statement?.dueAt}
        closingAt={selectedInvoiceGroup?.statement?.closingAt}
        confirming={payStatementMutation.isPending}
        onClose={() => setPayStatementConfirmOpen(false)}
        onConfirm={confirmPaySelectedStatement}
      />

      {/* Create/Edit plan */}
      <Dialog open={planModalOpen} onClose={closePlanModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {planModalMode === 'edit' ? t('modals.plan.editTitle') : t('modals.plan.createTitle')}
              </DialogTitle>
              <button type="button" onClick={closePlanModal} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitPlan(onSavePlan)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-gray-600">{t('forms.description')}</span>
                <input {...registerPlan('description')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.description && <span className="text-xs text-red-400">{planErrors.description.message}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.type')}</span>
                <select {...registerPlan('type')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  <option value="EXPENSE">{t('labels.expense')}</option>
                  <option value="INCOME">{t('labels.income')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.payment')}</span>
                <select {...registerPlan('paymentType')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  {paymentTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.totalValue')}</span>
                <input type="number" step="0.01" min="0" {...registerPlan('totalAmount')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.totalAmount && <span className="text-xs text-red-400">{planErrors.totalAmount.message}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.installmentCount')}</span>
                <input type="number" min="1" {...registerPlan('installmentCount')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.installmentCount && <span className="text-xs text-red-400">{planErrors.installmentCount.message}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <CalendarDays size={14} />
                  {t('forms.firstDueDate')}
                </span>
                <input type="date" {...registerPlan('firstDueDate')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.firstDueDate && <span className="text-xs text-red-400">{planErrors.firstDueDate.message}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.intervalMonths')}</span>
                <input type="number" min="1" {...registerPlan('intervalMonths')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.intervalMonths && <span className="text-xs text-red-400">{planErrors.intervalMonths.message}</span>}
              </label>
              {planModalMode === 'edit' && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">{t('forms.planStatus')}</span>
                  <select {...registerPlan('status')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                    {planStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </label>
              )}
              {planModalMode === 'edit' && (
                <label className="md:col-span-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" {...registerPlan('recalculateRemaining')} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40" />
                  {t('forms.recalculateOpenInstallments')}
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.categoryOptional')}</span>
                <select {...registerPlan('categoryId')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  <option value="">{t('forms.noCategory')}</option>
                  {(categoriesQuery.data ?? []).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.cardOptional')}</span>
                <select {...registerPlan('cardId')} disabled={watchedPaymentType !== 'CREDIT_CARD'} className="h-10 rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100">
                  <option value="">{t('forms.noCard')}</option>
                  {(cardQuery.data ?? []).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-gray-600">{t('forms.notesOptional')}</span>
                <textarea {...registerPlan('notes')} rows={3} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>
              <div className="md:col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                {t('forms.approxInstallmentValue')}: <strong>{formatBRL(approximateInstallmentValue)}</strong>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={closePlanModal} className="h-10 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {t('buttons.cancel')}
                </button>
                <button type="submit" disabled={isSavingPlan} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60">
                  {isSavingPlan ? t('buttons.saving') : planModalMode === 'edit' ? t('buttons.saveChanges') : t('buttons.createFuture')}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Settle */}
      <Dialog open={settleModalOpen} onClose={closeSettleModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">{t('modals.settle.title')}</DialogTitle>
              <button type="button" onClick={closeSettleModal} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitSettle(onSettle)} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">{selectedInstallment?.description}</p>
                <p className="text-slate-600 mt-1">
                  {t('modals.settle.installmentLine', {
                    number: Number(selectedInstallment?.installmentNumber ?? 0),
                    total: Number(selectedInstallment?.installmentCount ?? 0),
                    amount: formatBRL(selectedInstallment?.amount ?? 0),
                  })}
                </p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.amountPaidOptional')}</span>
                <input type="text" placeholder={t('forms.amountPaidPlaceholder')} {...registerSettle('amount')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {settleErrors.amount && <span className="text-xs text-red-400">{settleErrors.amount.message as string}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.paymentDateOptional')}</span>
                <input type="date" {...registerSettle('paidAt')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {settleErrors.paidAt && <span className="text-xs text-red-400">{settleErrors.paidAt.message as string}</span>}
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeSettleModal} className="h-10 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {t('buttons.cancel')}
                </button>
                <button type="submit" disabled={settleInstallmentMutation.isPending} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60">
                  {settleInstallmentMutation.isPending ? t('buttons.saving') : t('buttons.confirmSettle')}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Edit installment */}
      <Dialog open={installmentEditModalOpen} onClose={closeInstallmentEditModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">{t('modals.installmentEdit.title')}</DialogTitle>
              <button type="button" onClick={closeInstallmentEditModal} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitInstallmentEdit(onSaveInstallment)} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">{editingInstallment?.description}</p>
                <p className="text-slate-600 mt-1">
                  {t('modals.settle.installmentLine', {
                    number: Number(editingInstallment?.installmentNumber ?? 0),
                    total: Number(editingInstallment?.installmentCount ?? 0),
                    amount: formatBRL(editingInstallment?.amount ?? 0),
                  })}
                </p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.value')}</span>
                <input type="number" step="0.01" min="0" {...registerInstallmentEdit('amount')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {installmentEditErrors.amount && <span className="text-xs text-red-400">{installmentEditErrors.amount.message}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.dueDate')}</span>
                <input type="date" {...registerInstallmentEdit('dueDate')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {installmentEditErrors.dueDate && <span className="text-xs text-red-400">{installmentEditErrors.dueDate.message}</span>}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">{t('forms.status')}</span>
                <select {...registerInstallmentEdit('status')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  {installmentEditableStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {installmentEditErrors.status && <span className="text-xs text-red-400">{installmentEditErrors.status.message}</span>}
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" {...registerInstallmentEdit('recalculateRemaining')} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40" />
                {t('forms.recalculateNextInstallments')}
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeInstallmentEditModal} className="h-10 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {t('buttons.cancel')}
                </button>
                <button type="submit" disabled={updateInstallmentMutation.isPending} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60">
                  {updateInstallmentMutation.isPending ? t('buttons.saving') : t('buttons.saveInstallment')}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <DeleteConfirmModal
        isOpen={Boolean(deletePlanTarget)}
        onClose={() => setDeletePlanTarget(null)}
        onConfirm={onDeletePlan}
        title={t('delete.planTitle')}
        description={t('delete.planDescription', { description: deletePlanTarget?.description ?? '' })}
        confirmLabel={deletePlanMutation.isPending ? t('delete.deleting') : t('delete.delete')}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteInstallmentTarget)}
        onClose={() => setDeleteInstallmentTarget(null)}
        onConfirm={onDeleteInstallment}
        title={t('delete.installmentTitle')}
        description={t('delete.installmentDescription', { description: deleteInstallmentTarget?.description ?? '' })}
        confirmLabel={deleteInstallmentMutation.isPending ? t('delete.deleting') : t('delete.delete')}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteChargeTarget)}
        onClose={() => setDeleteChargeTarget(null)}
        onConfirm={onDeleteCharge}
        title="Excluir compra"
        description={`Excluir ${deleteChargeTarget?.description ?? 'esta compra'} da fatura?`}
        confirmLabel={deleteChargeMutation.isPending ? 'Excluindo...' : 'Excluir'}
      />
    </section>
  )
}
