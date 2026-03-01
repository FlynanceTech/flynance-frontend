'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { useFixedAccounts } from '@/hooks/query/useFixedAccounts'
import { useUserCyclePreferences } from '@/hooks/query/useUserCyclePreferences'
import { CategorySelect } from '../components/CategorySelect'
import { useCategories } from '@/hooks/query/useCategory'
import type { CategoryDTO, CategoryResponse } from '@/services/category'
import type { CreateCategoryDraft } from '../components/Categories/createCategoryModal'
import { useRouter } from 'next/navigation'
import { toApiDate } from '@/utils/apiDate'
import { resolveCompetenceRange } from '@/utils/resolveCompetenceRange'
import {
  buildFixedAccountEditPayload,
  FIXED_ACCOUNT_TIME_ZONE,
  isDueDayMatchingStartDate,
  toISODateOnlyFromDatePicker,
} from '@/utils/fixedAccountEdit'
import {
  currentCycleStatusLabel,
  isPaidInCompetence,
  isOverdueCurrentCycle,
  isPaidCurrentCycle,
  matchesCurrentCycleFilter,
  shouldDisplayOverdueTag,
} from '@/utils/fixedAccountCycleStatus'
import type { FixedAccountPayment, FixedAccountCycleStatus } from '@/services/fixedAccounts'

type FixedBill = {
  id: string
  name: string
  amount: number
  dueDay: number
  dueDate?: string
  notes?: string
  currency?: string
  status?: 'active' | 'paused' | 'canceled'
  autoPay?: boolean
  startDate?: string
  endDate?: string | null
  categoryId?: string | null
  categoryName?: string | null
  isPaid?: boolean
  payment?: FixedAccountPayment | null
  paymentCurrentCycle?: FixedAccountPayment | null
  lastPayment?: FixedAccountPayment | null
  payments?: FixedAccountPayment[]
  statusCurrentCycle?: FixedAccountCycleStatus
}

type FilterKey = 'all' | 'paid' | 'pending'
const FILTER_STORAGE_KEY = 'flynance:fixed-accounts:filter'
const MONTH_STORAGE_KEY = 'flynance:fixed-accounts:selected-month'

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function todayISODate() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function toBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function formatDateBR(iso?: string | null) {
  const d = parseDateOnly(iso)
  if (!d) return ''
  return d.toLocaleDateString('pt-BR')
}

function parseAmountInput(value: string) {
  const raw = String(value ?? '').trim()
  if (!raw) return NaN

  const sanitized = raw.replace(/[^\d,.-]/g, '')
  if (!sanitized) return NaN

  const hasComma = sanitized.includes(',')
  const hasDot = sanitized.includes('.')
  let normalized = sanitized

  if (hasComma && hasDot) {
    const lastComma = sanitized.lastIndexOf(',')
    const lastDot = sanitized.lastIndexOf('.')
    if (lastComma > lastDot) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = sanitized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = sanitized.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = sanitized.replace(/,/g, '')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

function formatAmountInput(value: string) {
  const digitsOnly = String(value ?? '').replace(/\D/g, '')
  if (!digitsOnly) return ''

  const asNumber = Number(digitsOnly) / 100
  if (!Number.isFinite(asNumber) || asNumber < 0) return ''

  return toBRL(asNumber)
}

function formatAmountFromNumber(value: number | null | undefined) {
  if (!Number.isFinite(value as number)) return ''
  return toBRL(Number(value))
}

function monthKeyFromDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function parseMonthKey(value?: string | null) {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})$/)
  if (!matched) return null

  const year = Number(matched[1])
  const monthIndex = Number(matched[2]) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  return { year, monthIndex }
}

function formatMonthKeyLabel(monthKey: string) {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKey

  const date = new Date(parsed.year, parsed.monthIndex, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function shiftMonthKey(monthKey: string, offset: number) {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKeyFromDate(new Date())

  const next = new Date(parsed.year, parsed.monthIndex + offset, 1)
  return monthKeyFromDate(next)
}

function getMonthKeyFromISODate(isoDate?: string | null) {
  const parsed = parseDateOnly(isoDate)
  return parsed ? monthKeyFromDate(parsed) : ''
}

function clampDateToMonth(isoDate: string, monthKey: string) {
  const targetMonth = parseMonthKey(monthKey)
  if (!targetMonth) return isoDate

  const sourceDate = parseDateOnly(isoDate) ?? new Date()
  const sourceDay = Math.max(1, sourceDate.getDate())
  const lastDay = new Date(targetMonth.year, targetMonth.monthIndex + 1, 0).getDate()
  const clampedDay = Math.min(sourceDay, lastDay)
  return toApiDate(new Date(targetMonth.year, targetMonth.monthIndex, clampedDay))
}

function getDefaultFirstDueDateForMonth(monthKey: string) {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return todayISODate()

  const today = new Date()
  const day = Math.max(1, today.getDate())
  const lastDay = new Date(parsed.year, parsed.monthIndex + 1, 0).getDate()
  return toApiDate(new Date(parsed.year, parsed.monthIndex, Math.min(day, lastDay)))
}

function isISODateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '').trim())
}

function getDueDateForSelectedMonth(cycleMonthKey: string, dueDay: number) {
  const parsed = parseMonthKey(cycleMonthKey)
  const base = parsed ? new Date(parsed.year, parsed.monthIndex, 1) : new Date()
  const safeDay = Math.max(1, Math.trunc(dueDay || 1))
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const dueDate = new Date(base.getFullYear(), base.getMonth(), Math.min(safeDay, lastDay))
  return toApiDate(dueDate)
}

function isDateWithinRange(value: Date, start: Date, end: Date) {
  return value.getTime() >= start.getTime() && value.getTime() <= end.getTime()
}

function getDueDateForCompetenceRange(periodStart: string, periodEnd: string, dueDay: number) {
  const start = parseDateOnly(periodStart)
  const end = parseDateOnly(periodEnd)
  if (!start || !end) return null

  const safeDay = Math.max(1, Math.trunc(dueDay || 1))
  const lastDayOfStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()

  const startCandidate = new Date(
    start.getFullYear(),
    start.getMonth(),
    Math.min(safeDay, lastDayOfStartMonth)
  )
  const endCandidate = new Date(end.getFullYear(), end.getMonth(), Math.min(safeDay, lastDayOfEndMonth))

  if (isDateWithinRange(startCandidate, start, end)) return toApiDate(startCandidate)
  if (isDateWithinRange(endCandidate, start, end)) return toApiDate(endCandidate)
  return toApiDate(endCandidate)
}

function resolveMarkPaidDueDate(
  bill: FixedBill,
  fallbackMonthKey: string,
  periodStart: string,
  periodEnd: string
) {
  const fromApiCycle =
    bill.paymentCurrentCycle?.dueDate ??
    bill.payment?.dueDate ??
    bill.dueDate ??
    null

  const normalizedFromApi = fromApiCycle ? toISODateOnlyFromDatePicker(fromApiCycle) : null
  if (normalizedFromApi) return normalizedFromApi

  const fromCompetenceRange = getDueDateForCompetenceRange(periodStart, periodEnd, bill.dueDay)
  if (fromCompetenceRange) return fromCompetenceRange

  return getDueDateForSelectedMonth(fallbackMonthKey, bill.dueDay)
}

function resolveCurrentPeriodKey(bill: FixedBill, fallbackPeriodKey: string) {
  return (
    bill.paymentCurrentCycle?.periodKey ||
    bill.payment?.periodKey ||
    bill.payments?.find((payment) => payment.periodKey)?.periodKey ||
    fallbackPeriodKey
  )
}

type DisplayCycleStatus = 'PAID' | 'PENDING' | 'OVERDUE'
type FixedBillWithDisplayStatus = FixedBill & { displayStatus: DisplayCycleStatus }

function resolveBillDisplayStatus(
  bill: FixedBill,
  periodStart: string,
  periodEnd: string,
  fallbackMonthKey: string
): DisplayCycleStatus {
  const paid = isPaidInCompetence({
    status: bill.statusCurrentCycle,
    selectedMonthKey: fallbackMonthKey,
    periodStart,
    periodEnd,
    paymentCurrentCycle: bill.paymentCurrentCycle,
    payment: bill.payment,
  })

  if (paid) return 'PAID'

  const dueDateFromCycle =
    bill.paymentCurrentCycle?.dueDate ??
    bill.payment?.dueDate ??
    getDueDateForCompetenceRange(periodStart, periodEnd, bill.dueDay) ??
    getDueDateForSelectedMonth(fallbackMonthKey, bill.dueDay)
  const normalizedDueDate = toISODateOnlyFromDatePicker(dueDateFromCycle)
  const overdue = shouldDisplayOverdueTag({
    status: bill.statusCurrentCycle,
    dueDate: normalizedDueDate,
    isPaid: false,
    timeZone: FIXED_ACCOUNT_TIME_ZONE,
  })

  return overdue ? 'OVERDUE' : 'PENDING'
}

export default function FixedBillsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => monthKeyFromDate(new Date()))
  const { preferencesQuery } = useUserCyclePreferences()
  const competenceRange = useMemo(
    () => resolveCompetenceRange(selectedMonthKey, preferencesQuery.data),
    [selectedMonthKey, preferencesQuery.data]
  )
  const competenceQueryParams = useMemo(
    () => ({
      periodStart: competenceRange.periodStart,
      periodEnd: competenceRange.periodEnd,
    }),
    [competenceRange.periodEnd, competenceRange.periodStart]
  )
  const { fixedAccountsQuery, createMutation, updateMutation, deleteMutation, markPaidMutation, unmarkPaidMutation } =
    useFixedAccounts(competenceQueryParams)
  const {
    categoriesQuery: { data: categories = [] },
    createMutation: createCategoryMutation,
  } = useCategories()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [payConfirmOpen, setPayConfirmOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<FixedBill | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISODate())

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [firstDueDateISO, setFirstDueDateISO] = useState(() =>
    getDefaultFirstDueDateForMonth(selectedMonthKey)
  )
  const [firstCompetenceMonthKey, setFirstCompetenceMonthKey] = useState(() => selectedMonthKey)
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY)
    if (stored === 'all' || stored === 'paid' || stored === 'pending') {
      setFilter(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(FILTER_STORAGE_KEY, filter)
  }, [filter])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(MONTH_STORAGE_KEY)
    if (parseMonthKey(stored)) setSelectedMonthKey(stored as string)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MONTH_STORAGE_KEY, selectedMonthKey)
  }, [selectedMonthKey])

  const bills = useMemo(() => {
    const data = fixedAccountsQuery.data ?? []
    return data
      .map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDay: b.dueDay,
        dueDate: b.dueDate,
        notes: b.notes,
        currency: b.currency,
        status: b.status,
        autoPay: b.autoPay,
        startDate: b.startDate,
        endDate: b.endDate,
        categoryId: b.category?.id ?? null,
        categoryName: b.category?.name ?? null,
        isPaid: b.isPaid ?? false,
        payment: b.payment ?? null,
        paymentCurrentCycle: b.paymentCurrentCycle ?? null,
        lastPayment: b.lastPayment ?? null,
        payments: b.payments ?? [],
        statusCurrentCycle: b.statusCurrentCycle,
      }))
      .sort((a, b) => a.dueDay - b.dueDay)
  }, [fixedAccountsQuery.data])

  const billsWithDisplayStatus = useMemo<FixedBillWithDisplayStatus[]>(() => {
    return bills.map((bill) => ({
      ...bill,
      displayStatus: resolveBillDisplayStatus(
        bill,
        competenceRange.periodStart,
        competenceRange.periodEnd,
        selectedMonthKey
      ),
    }))
  }, [bills, competenceRange.periodEnd, competenceRange.periodStart, selectedMonthKey])

  const selectedMonthLabel = useMemo(() => formatMonthKeyLabel(selectedMonthKey), [selectedMonthKey])

  const summary = useMemo(() => {
    const paid = billsWithDisplayStatus.filter((bill) => isPaidCurrentCycle(bill.displayStatus)).length
    const pending = billsWithDisplayStatus.filter((bill) =>
      matchesCurrentCycleFilter(bill.displayStatus, 'pending')
    ).length
    return { paid, pending, total: billsWithDisplayStatus.length }
  }, [billsWithDisplayStatus])

  const monthlyTotals = useMemo(() => {
    return billsWithDisplayStatus.reduce(
      (acc, bill) => {
        const billAmount = Number(bill.amount ?? 0)
        if (!Number.isFinite(billAmount)) return acc

        acc.total += billAmount
        if (isPaidCurrentCycle(bill.displayStatus)) {
          const paidAmount = Number(bill.paymentCurrentCycle?.amount ?? billAmount)
          acc.paid += Number.isFinite(paidAmount) ? paidAmount : billAmount
        }
        return acc
      },
      { total: 0, paid: 0 }
    )
  }, [billsWithDisplayStatus])

  const monthlyPendingAmount = Math.max(0, monthlyTotals.total - monthlyTotals.paid)

  const visibleBills = useMemo<FixedBillWithDisplayStatus[]>(() => {
    return billsWithDisplayStatus.filter((bill) => matchesCurrentCycleFilter(bill.displayStatus, filter))
  }, [billsWithDisplayStatus, filter])

  const emptyStateMessage = useMemo(() => {
    if (billsWithDisplayStatus.length === 0) return `Nenhuma conta fixa para ${selectedMonthLabel}.`
    if (filter === 'paid') return `Nenhuma conta paga em ${selectedMonthLabel}.`
    if (filter === 'pending') return `Nenhuma conta pendente em ${selectedMonthLabel}.`
    return 'Nenhuma conta fixa cadastrada.'
  }, [billsWithDisplayStatus.length, filter, selectedMonthLabel])

  const selectedCategoryObj = useMemo<CategoryResponse | null>(() => {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId) ?? null
  }, [categories, categoryId])

  const resetForm = () => {
    const baseMonth = selectedMonthKey
    setName('')
    setAmount('')
    setFirstCompetenceMonthKey(baseMonth)
    setFirstDueDateISO(getDefaultFirstDueDateForMonth(baseMonth))
    setNotes('')
    setCategoryId('')
    setFormError(null)
    setEditingBill(null)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    resetForm()
  }

  const handleCreateCategory = async (draft: CreateCategoryDraft): Promise<CategoryResponse> => {
    const payload: CategoryDTO = {
      name: draft.name,
      type: draft.type,
      color: draft.color,
      icon: draft.icon,
      keywords: draft.keywords,
    }

    const created = await createCategoryMutation.mutateAsync(payload)
    return created
  }

  const firstDueDateIsValid =
    isISODateOnly(firstDueDateISO) && Boolean(toISODateOnlyFromDatePicker(firstDueDateISO))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const trimmed = name.trim()
    const parsedAmount = parseAmountInput(amount)
    if (!trimmed || Number.isNaN(parsedAmount) || parsedAmount <= 0) return

    if (!isISODateOnly(firstDueDateISO)) {
      setFormError('Use o formato de data YYYY-MM-DD para salvar.')
      return
    }

    const submitStartDate =
      editingBill != null ? firstDueDateISO : clampDateToMonth(firstDueDateISO, firstCompetenceMonthKey)

    const payload = buildFixedAccountEditPayload({
      name: trimmed,
      amount: parsedAmount,
      categoryId,
      notes,
      startDateInput: submitStartDate,
    })

    if (!payload) {
      setFormError('Primeiro vencimento invalido. Use uma data valida no formato YYYY-MM-DD.')
      return
    }

    if (!isDueDayMatchingStartDate(payload.startDate, payload.dueDay)) {
      setFormError('Dia de vencimento invalido para a data selecionada.')
      return
    }

    try {
      if (editingBill?.id) {
        await updateMutation.mutateAsync({ id: editingBill.id, data: payload })
        await fixedAccountsQuery.refetch()
        closeDrawer()
        return
      }

      await createMutation.mutateAsync(payload)
      await fixedAccountsQuery.refetch()
      closeDrawer()
    } catch (err: any) {
      const status = Number(err?.status ?? err?.response?.status)
      if (status === 400) {
        setFormError('Dados invalidos. Confira o primeiro vencimento e tente novamente.')
      } else {
        setFormError(err?.message ?? 'Nao foi possivel salvar a conta fixa.')
      }
      toast.error(err?.message ?? 'Nao foi possivel salvar a conta fixa.')
    }
  }

  const handleEdit = (bill: FixedBill) => {
    setEditingBill(bill)
    setFormError(null)
    setName(bill.name ?? '')
    setAmount(formatAmountFromNumber(bill.amount))
    const normalizedStartDate =
      toISODateOnlyFromDatePicker(bill.startDate ?? bill.dueDate ?? todayISODate()) ?? todayISODate()
    setFirstDueDateISO(normalizedStartDate)
    setFirstCompetenceMonthKey(getMonthKeyFromISODate(normalizedStartDate) || selectedMonthKey)
    setNotes(bill.notes ?? '')
    setCategoryId((bill.categoryId as string) ?? '')
    setDrawerOpen(true)
  }

  const openPayConfirm = (bill: FixedBill) => {
    setPayTarget(bill)
    setPayAmount(formatAmountFromNumber(bill.paymentCurrentCycle?.amount ?? bill.amount))
    setPayDate(todayISODate())
    setPayConfirmOpen(true)
  }

  const handleConfirmPay = async () => {
    if (!payTarget) return
    const parsedAmount = parseAmountInput(payAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor valido para confirmar o pagamento.')
      return
    }

    try {
      const dueDate = resolveMarkPaidDueDate(
        payTarget,
        selectedMonthKey,
        competenceRange.periodStart,
        competenceRange.periodEnd
      )
      const optimisticPeriodKey = resolveCurrentPeriodKey(
        payTarget,
        getMonthKeyFromISODate(dueDate) || selectedMonthKey
      )

      await markPaidMutation.mutateAsync({
        id: payTarget.id,
        optimisticPeriodKey,
        data: {
          amount: parsedAmount,
          paidAt: payDate || todayISODate(),
          dueDate,
        },
      })
      await fixedAccountsQuery.refetch()
      toast.success('Pagamento confirmado com sucesso.')
      setPayConfirmOpen(false)
      setPayTarget(null)
      setPayDate(todayISODate())
      setPayAmount('')
    } catch (err: any) {
      if (String(err?.message ?? '').includes('fixedAccountCycleOutOfRange')) {
        toast.error('Essa conta nao pertence ao ciclo selecionado. Atualize o mes e tente novamente.')
        return
      }
      toast.error(err?.message ?? 'Nao foi possivel confirmar o pagamento.')
    }
  }

  const closePayConfirm = () => {
    setPayConfirmOpen(false)
    setPayTarget(null)
    setPayDate(todayISODate())
    setPayAmount('')
  }

  const togglePaid = async (id: string, bill: FixedBill, isPaidInCurrentCompetence: boolean) => {
    if (!isPaidInCurrentCompetence) {
      openPayConfirm(bill)
      return
    }

    const periodKey = resolveCurrentPeriodKey(bill, selectedMonthKey)
    try {
      await unmarkPaidMutation.mutateAsync({ id, periodKey })
      await fixedAccountsQuery.refetch()
      toast.success('Pagamento desmarcado com sucesso.')
    } catch (err: any) {
      toast.error(err?.message ?? 'Nao foi possivel desmarcar o pagamento.')
    }
  }

  const removeBill = (id: string) => {
    deleteMutation.mutate(id)
  }

  const requestDelete = (id: string) => {
    setDeleteTargetId(id)
    setDeleteConfirmOpen(true)
  }

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header
        title="Minhas Contas"
        subtitle="Lista de obrigacoes recorrentes do seu mes."
        newTransation={false}
        rightContent={
          <button
            type="button"
            onClick={() => {
              resetForm()
              setDrawerOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            Nova conta fixa
          </button>
        }
      />



    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-gray-300 bg-white p-3 sm:p-4 flex flex-col gap-1">
          <span className="text-base sm:text-sm text-slate-500">
            Pagas: <strong>{summary.paid}</strong>
          </span>
          <span className="text-base sm:text-sm text-slate-500">
            Pendentes: <strong>{summary.pending}</strong>
          </span>
        </div>
        <div className="min-w-0 rounded-lg border border-gray-300 bg-white p-3 sm:p-4 flex flex-col gap-1">
          <span className="text-sm sm:text-sm text-slate-500">
            Total estimado: <strong>{toBRL(monthlyTotals.total)}</strong> 
          </span>
          <span className="text-sm sm:text-sm text-slate-500">
           Pago:{' '}
          <strong>{toBRL(monthlyTotals.paid)}</strong>
          </span>
        </div>
        <div className="col-span-2 min-w-0 rounded-lg border border-gray-300 bg-white p-3 sm:p-4 flex flex-col gap-1 sm:col-span-2 xl:col-span-1">
          <span className="text-sm sm:text-sm text-slate-500">
            Pendente:{' '}
          <strong>{toBRL(monthlyPendingAmount)}</strong>
          </span>
          <span className="text-sm sm:text-sm text-slate-500">
            Competencia {competenceRange.label}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border bg-white border-gray-200 px-2 py-1">
          <button
            type="button"
            onClick={() => setSelectedMonthKey((prev) => shiftMonthKey(prev, -1))}
            className="rounded-full px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Mes anterior"
          >
            {'<'}
          </button>
          <input
            type="month"
            value={selectedMonthKey}
            onChange={(e) => {
              const next = e.target.value
              if (parseMonthKey(next)) setSelectedMonthKey(next)
            }}
            className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-secondary/50"
          />
          <button
            type="button"
            onClick={() => setSelectedMonthKey((prev) => shiftMonthKey(prev, 1))}
            className="rounded-full px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Proximo mes"
          >
            {'>'}
          </button>
        </div>
        <div className='flex gap-2'>
          {(['all', 'pending', 'paid'] as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-semibold border',
                filter === key
                  ? 'bg-secondary/30 border-secondary text-[#333C4D]'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              )}
            >
              {key === 'all' ? 'Todas' : key === 'paid' ? 'Pagas' : 'Pendentes'}
            </button>
          ))}
        </div>
      </div>
    </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
 

          <div className="flex flex-col gap-3">
            {fixedAccountsQuery.isLoading && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Carregando contas fixas...
              </div>
            )}

            {fixedAccountsQuery.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Erro ao carregar contas fixas.
              </div>
            )}

            {!fixedAccountsQuery.isLoading && !fixedAccountsQuery.isError && visibleBills.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                {emptyStateMessage}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleBills.map((bill) => {
              const paid = isPaidCurrentCycle(bill.displayStatus)
              const overdue = isOverdueCurrentCycle(bill.displayStatus)
              const statusLabel = currentCycleStatusLabel(bill.displayStatus)

              return (
                <div
                  key={bill.id}
                  className={clsx(
                    'rounded-lg border border-gray-200 p-4 flex flex-col gap-3 cursor-pointer',
                    paid ? 'bg-emerald-50/40' : 'bg-white'
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/dashboard/contas-fixas/${bill.id}/historico`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/dashboard/contas-fixas/${bill.id}/historico`)
                    }
                  }}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 w-full">
                      <div className='flex w-full items-center justify-between'>
                        <h3 className="text-sm font-semibold text-gray-800 truncate">{bill.name}</h3>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                         

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(bill)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 md:h-auto md:w-auto md:gap-2 md:px-3 md:py-1 md:text-xs md:font-semibold cursor-pointer"
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden md:inline">Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              requestDelete(bill.id)
                            }}
                            disabled={deleteMutation.isPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-red-600 hover:bg-red-50 disabled:opacity-60 md:h-auto md:w-auto md:gap-2 md:px-3 md:py-1 md:text-xs md:font-semibold cursor-pointer"
                            title="Remover"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden md:inline">
                              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>Vence todo dia {bill.dueDay}</span>
                        <span>•</span>
                        <span>{toBRL(bill.amount)}</span>
                        {bill.currency && bill.currency !== 'BRL' && (
                          <>
                            <span>•</span>
                            <span>{bill.currency}</span>
                          </>
                        )}
                        {bill.categoryName && (
                          <>
                            <span>•</span>
                            <span>{bill.categoryName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                        <span>Competencia: {competenceRange.label}</span>
                        <span>•</span>
                        <span>Status: {statusLabel}</span>
                       {/*  <span>•</span>
                        <span>Fim: {formatDateBR(bill.endDate) || 'Sem data fim'}</span> */}
                      </div>
                      {bill.notes && (
                        <span className="text-xs text-gray-400 mt-1 truncate">{bill.notes}</span>
                      )}
                    </div>
                
                  </div>

                  <div className="flex w-full flex-col md:flex-row justify-between gap-2">
                    <div className='flex'>
                      {overdue && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          Atrasada
                        </span>
                      )}
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
                          paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {paid ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePaid(bill.id, bill, paid)
                      }}
                      className={clsx(
                        'inline-flex w-full items-center justify-center cursor-pointer gap-2 rounded-full px-3 py-2 text-xs font-semibold border md:w-auto md:py-1',
                        paid
                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Check className="h-3 w-3" />
                      {paid ? 'Desmarcar pagamento' : 'Marcar como pago'}
                    </button>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setDeleteTargetId(null)
        }}
        onConfirm={() => {
          if (deleteTargetId) removeBill(deleteTargetId)
        }}
        title="Excluir conta fixa"
        description="Tem certeza que deseja excluir esta conta fixa?"
      />

      <Dialog open={payConfirmOpen} onClose={closePayConfirm} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Confirmar pagamento
            </DialogTitle>
            <p className="mt-2 text-sm text-gray-500">
              Confira o valor pago para {payTarget?.name ?? 'esta conta fixa'}.
            </p>

            <div className="mt-4">
              <label className="text-sm text-gray-600">Valor pago</label>
              <input
                value={payAmount}
                onChange={(e) => setPayAmount(formatAmountInput(e.target.value))}
                type="text"
                inputMode="decimal"
                className="mt-2 w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                placeholder="R$ 0,00"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm text-gray-600">Data do pagamento</label>
              <input
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                type="date"
                className="mt-2 w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
              />
            </div>

            <div className="mt-6 flex w-full gap-2">
              <button
                type="button"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={closePayConfirm}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 cursor-pointer"
                onClick={handleConfirmPay}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? 'Confirmando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={drawerOpen} onClose={closeDrawer} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-end">
          <DialogPanel className="bg-white w-4/5 max-w-md h-full rounded-l-xl shadow-lg p-6 space-y-6 overflow-y-auto">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-lg font-semibold text-gray-800">
                {editingBill ? 'Editar conta fixa' : 'Nova conta fixa'}
              </DialogTitle>
              <button
                onClick={closeDrawer}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600">Nome</label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setFormError(null)
                  }}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                  placeholder="Ex: Internet, Aluguel"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600">Categoria</label>
                <CategorySelect
                  value={selectedCategoryObj}
                  onChange={(cat) => {
                    setCategoryId((cat as CategoryResponse | null)?.id ?? '')
                    setFormError(null)
                  }}
                  typeFilter="EXPENSE"
                  placeholder="Selecione uma categoria"
                  allowCreate
                  onCreateCategory={handleCreateCategory}
                  className="w-full"
                />
              </div>

              {!editingBill && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600">Mes de competencia inicial</label>
                  <input
                    type="month"
                    value={firstCompetenceMonthKey}
                    onChange={(e) => {
                      const nextMonthKey = e.target.value
                      if (!parseMonthKey(nextMonthKey)) return
                      setFirstCompetenceMonthKey(nextMonthKey)
                      setFirstDueDateISO((prev) => {
                        const baseDate = prev || getDefaultFirstDueDateForMonth(nextMonthKey)
                        return clampDateToMonth(baseDate, nextMonthKey)
                      })
                      setFormError(null)
                    }}
                    className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                  />
                  <span className="text-xs text-gray-500">
                    Esta conta sera vinculada a partir de {formatMonthKeyLabel(firstCompetenceMonthKey)}.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600">Valor aproximado</label>
                  <input
                    value={amount}
                    onChange={(e) => {
                      setAmount(formatAmountInput(e.target.value))
                      setFormError(null)
                    }}
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                    placeholder="R$ 0,00"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600">Primeiro vencimento</label>
                  <input
                    value={firstDueDateISO}
                    onChange={(e) => {
                      const normalized = toISODateOnlyFromDatePicker(e.target.value)
                      setFirstDueDateISO(normalized ?? '')
                      if (normalized) {
                        setFirstCompetenceMonthKey(getMonthKeyFromISODate(normalized) || firstCompetenceMonthKey)
                      }
                      setFormError(null)
                    }}
                    type="date"
                    lang="pt-BR"
                    className={clsx(
                      'w-full rounded-full border px-4 py-2 text-sm',
                      firstDueDateIsValid ? 'border-gray-200' : 'border-red-400'
                    )}
                    required
                  />
                  {!firstDueDateIsValid && (
                    <span className="text-xs text-red-600">Informe uma data valida.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600">Observacao</label>
                <input
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value)
                    setFormError(null)
                  }}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                  placeholder="Opcional"
                />
              </div>
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}
              <span className="text-xs text-gray-500">
                * Contas fixas representam obrigacoes recorrentes. Marcar pagamento e opcional.
              </span>
              <button
                type="submit"
                className="w-full mt-4 bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-full cursor-pointer disabled:opacity-60"
                disabled={createMutation.isPending || updateMutation.isPending || !firstDueDateIsValid}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : editingBill
                  ? 'Salvar alteracoes'
                  : 'Adicionar conta fixa'}
              </button>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </section>
  )
}
