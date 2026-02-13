'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, CheckCircle2, Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

import Header from '../components/Header'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/skeleton'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

import { useCategories } from '@/hooks/query/useCategory'
import { useCardMutations } from '@/hooks/query/useCreditCards'
import {
  FutureEditableInstallmentStatus,
  FutureInstallment,
  FutureInstallmentPlan,
  FuturePaymentType,
  FuturePlanStatus,
  FutureStatus,
  FutureType,
} from '@/services/futureService'
import {
  useFutureForecast,
  useFutureInstallments,
  useFutureMutations,
  useFuturePlans,
} from '@/hooks/query/useFuture'

const planSchema = z.object({
  description: z.string().min(2, 'Informe uma descricao'),
  type: z.enum(['EXPENSE', 'INCOME']),
  paymentType: z.enum([
    'DEBIT_CARD',
    'CREDIT_CARD',
    'PIX',
    'BOLETO',
    'TED',
    'DOC',
    'MONEY',
    'CASH',
    'OTHER',
  ]),
  categoryId: z.string().optional(),
  cardId: z.string().optional(),
  totalAmount: z.coerce.number().min(0.01, 'Informe um valor maior que zero'),
  installmentCount: z.coerce.number().int().min(1, 'Minimo 1 parcela').max(240, 'Maximo 240 parcelas'),
  intervalMonths: z.coerce.number().int().min(1, 'Minimo 1').max(12, 'Maximo 12'),
  firstDueDate: z.string().min(1, 'Informe a data do primeiro vencimento'),
  status: z.enum(['active', 'completed', 'canceled']).optional(),
  recalculateRemaining: z.boolean().optional(),
  notes: z.string().optional(),
})

const settleSchema = z.object({
  amount: z.string().optional(),
  paidAt: z.string().optional(),
})

const installmentEditSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Informe valor maior que zero'),
  dueDate: z.string().min(1, 'Informe a data de vencimento'),
  status: z.enum(['pending', 'canceled']),
  recalculateRemaining: z.boolean(),
})

type PlanFormData = z.infer<typeof planSchema>
type SettleFormData = z.infer<typeof settleSchema>
type InstallmentEditFormData = z.infer<typeof installmentEditSchema>

const paymentTypeOptions: { value: FuturePaymentType; label: string }[] = [
  { value: 'DEBIT_CARD', label: 'Cartao de debito' },
  { value: 'CREDIT_CARD', label: 'Cartao de credito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TED', label: 'TED' },
  { value: 'DOC', label: 'DOC' },
  { value: 'MONEY', label: 'Dinheiro' },
  { value: 'CASH', label: 'Especie' },
  { value: 'OTHER', label: 'Outro' },
]

const statusOptions: { value: '' | FutureStatus; label: string }[] = [
  { value: '', label: 'Todos status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'overdue', label: 'Vencida' },
  { value: 'settled', label: 'Liquidada' },
  { value: 'canceled', label: 'Cancelada' },
]

const typeOptions: { value: '' | FutureType; label: string }[] = [
  { value: '', label: 'Todos tipos' },
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
]

const planStatusOptions: { value: FuturePlanStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluido' },
  { value: 'canceled', label: 'Cancelado' },
]

const installmentEditableStatusOptions: { value: FutureEditableInstallmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'canceled', label: 'Cancelada' },
]

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0))
}

function roundCurrency(v: number) {
  return Math.round(Number(v || 0) * 100) / 100
}

function formatDateBR(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
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

function statusLabel(status: FutureStatus) {
  if (status === 'pending') return 'Pendente'
  if (status === 'overdue') return 'Vencida'
  if (status === 'settled') return 'Liquidada'
  if (status === 'canceled') return 'Cancelada'
  return status
}

function normalizePlanStatus(raw?: string | null): FuturePlanStatus {
  const value = (raw ?? '').toString().toLowerCase()
  if (value === 'completed') return 'completed'
  if (value === 'canceled') return 'canceled'
  return 'active'
}

function mapFutureDomainError(message: string) {
  const m = (message || '').toLowerCase()
  if (m.includes('amountexceedsplantotal')) return 'Valor informado excede o total do plano.'
  if (m.includes('plantotalmismatch')) return 'Não foi possível fechar o saldo do plano com as parcelas disponíveis.'
  if (
    m.includes('status') &&
    (m.includes('parcela liquidada') || m.includes('settled'))
  ) {
    return 'Não é possível editar/cancelar parcela já liquidada.'
  }
  return message || 'Não foi possível concluir a operação.'
}

export default function FuturosPage() {
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

  const { categoriesQuery } = useCategories()
  const { cardQuery } = useCardMutations()
  const {
    createPlanMutation,
    updatePlanMutation,
    deletePlanMutation,
    settleInstallmentMutation,
    updateInstallmentMutation,
    deleteInstallmentMutation,
  } = useFutureMutations()

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
    {
      planId: selectedPlanId || undefined,
      page: 1,
      limit: 300,
    },
    { enabled: Boolean(selectedPlanId) }
  )

  const forecastQuery = useFutureForecast({
    from: filters.from || undefined,
    to: filters.to || undefined,
  })

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
    defaultValues: {
      amount: '',
      paidAt: '',
    },
  })

  const {
    register: registerInstallmentEdit,
    handleSubmit: handleSubmitInstallmentEdit,
    reset: resetInstallmentEdit,
    formState: { errors: installmentEditErrors },
  } = useForm<InstallmentEditFormData>({
    resolver: zodResolver(installmentEditSchema),
    defaultValues: {
      amount: 0,
      dueDate: '',
      status: 'pending',
      recalculateRemaining: true,
    },
  })

  const watchedAmount = Number(watchPlan('totalAmount') || 0)
  const watchedCount = Number(watchPlan('installmentCount') || 1)
  const watchedPaymentType = watchPlan('paymentType')

  const approximateInstallmentValue = useMemo(() => {
    if (!watchedAmount || !watchedCount) return 0
    return watchedAmount / watchedCount
  }, [watchedAmount, watchedCount])

  const plans = plansQuery.data?.plans ?? []
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
    if (installmentsMeta.total > 0) {
      return Math.max(1, Math.ceil(installmentsMeta.total / Math.max(installmentsMeta.limit || 1, 1)))
    }
    if (installmentsMeta.hasNext) return installmentsMeta.page + 1
    return 1
  }, [installmentsMeta])

  const planTotalCheckInstallments = planTotalCheckQuery.data?.installments ?? []
  const planTotalCheckMeta = planTotalCheckQuery.data?.meta
  const planInstallmentsSum = useMemo(
    () => roundCurrency(planTotalCheckInstallments.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
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

  const openCreatePlanModal = () => {
    setPlanModalMode('create')
    setEditingPlan(null)
    resetPlan({
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
          payload: {
            ...basePayload,
            status: data.status ?? 'active',
            recalculateRemaining: data.recalculateRemaining ?? true,
          },
        })
      } else {
        await createPlanMutation.mutateAsync(basePayload)
      }

      closePlanModal()
      toast.success(planModalMode === 'edit' ? 'Transação Futura atualizada.' : 'Transação Futura criada.')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao salvar Transação Futura.'
      const message = mapFutureDomainError(raw)
      setActionError(message)
      toast.error(message)
    }
  }

  const onDeletePlan = async () => {
    if (!deletePlanTarget?.id) return
    setActionError(null)
    try {
      await deletePlanMutation.mutateAsync(deletePlanTarget.id)
      if (selectedPlanId === deletePlanTarget.id) {
        setSelectedPlanId(null)
      }
      setDeletePlanTarget(null)
      toast.success('Transação Futura excluído.')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao excluir Transação Futura.'
      const message = mapFutureDomainError(raw)
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
      toast.success('Parcela atualizada.')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao atualizar parcela.'
      const message = mapFutureDomainError(raw)
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
      toast.success('Parcela excluída.')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao excluir parcela.'
      const message = mapFutureDomainError(raw)
      setActionError(message)
      toast.error(message)
    }
  }

  const openSettleModal = (installment: FutureInstallment) => {
    setSelectedInstallment(installment)
    resetSettle({
      amount: '',
      paidAt: toDateInput(new Date().toISOString()),
    })
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
        body: {
          amount,
          paidAt: data.paidAt ? toIsoFromDateInput(data.paidAt) : undefined,
        },
      })

      closeSettleModal()
      toast.success('Baixa registrada.')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao dar baixa na parcela.'
      const message = mapFutureDomainError(raw)
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
        payload: {
          totalAmount: planInstallmentsSum,
          recalculateRemaining: false,
        },
      })
      toast.success('Total da transação futura sincronizado com as parcelas.')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao sincronizar total da transação futura.'
      const message = mapFutureDomainError(raw)
      setActionError(message)
      toast.error(message)
    } finally {
      setSyncingPlanId(null)
    }
  }

  const loadingCards = forecastQuery.isLoading
  const loadingPlans = plansQuery.isLoading
  const loadingInstallments = installmentsQuery.isLoading

  const hasError =
    plansQuery.isError ||
    forecastQuery.isError ||
    (Boolean(selectedPlanId) && installmentsQuery.isError)

  const errorMessage =
    (plansQuery.error as Error | undefined)?.message ||
    (installmentsQuery.error as Error | undefined)?.message ||
    (forecastQuery.error as Error | undefined)?.message ||
    'Erro ao carregar futuros.'

  const totals = forecastQuery.data?.totals
  const isSavingPlan = createPlanMutation.isPending || updatePlanMutation.isPending

  return (
    <section className="w-full h-full pt-8 lg:px-8 px-4 pb-24 lg:pb-0 flex flex-col gap-6 overflow-auto">
      <Header
        title="Futuros"
        subtitle="Gerencie Transaçôes Futuras e acompanhe previsoes de despesas e receitas futuras."
        newTransation={false}
        rightContent={
          <button
            type="button"
            onClick={openCreatePlanModal}
            className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary flex items-center gap-2"
          >
            <Plus size={16} />
            Transação Futura
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">De</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => {
                setPlanPage(1)
                setFilters((p) => ({ ...p, from: e.target.value, page: 1 }))
              }}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Ate</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => {
                setPlanPage(1)
                setFilters((p) => ({ ...p, to: e.target.value, page: 1 }))
              }}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Tipo</span>
            <select
              value={filters.type}
              onChange={(e) => {
                setPlanPage(1)
                setFilters((p) => ({ ...p, type: e.target.value as '' | FutureType, page: 1 }))
              }}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            >
              {typeOptions.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Status (parcelas)</span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value as '' | FutureStatus, page: 1 }))
              }
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Itens por pagina (parcelas)</span>
            <select
              value={filters.limit}
              onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
              className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">A pagar</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{loadingCards ? '...' : formatBRL(totals?.toPay ?? 0)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">A receber</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {loadingCards ? '...' : formatBRL(totals?.toReceive ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Vencidas (pagar / receber)</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {loadingCards
              ? '...'
              : `${formatBRL(totals?.overdueToPay ?? 0)} / ${formatBRL(totals?.overdueToReceive ?? 0)}`}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Qtd. pendente / vencida</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {loadingCards ? '...' : `${Number(totals?.pendingCount ?? 0)} / ${Number(totals?.overdueCount ?? 0)}`}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-semibold text-gray-800">Lista de transações futuras</h3>
          <span className="text-xs text-gray-500">{visiblePlans.length} ativo(s)</span>
        </div>

        {loadingPlans ? (
          <Skeleton type="table" rows={6} />
        ) : visiblePlans.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">Nenhuma transação futura encontrada.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 pr-3">Descricao</th>
                    <th className="py-3 pr-3">Tipo</th>
                    <th className="py-3 pr-3">Parcelas</th>
                    <th className="py-3 pr-3">Total</th>
                    <th className="py-3 pr-3">1o vencimento</th>
                    <th className="py-3 pr-3">Intervalo</th>
                    <th className="py-3 pr-3 text-right">Acoes</th>
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
                        className={`border-b border-gray-100 ${selected ? 'bg-sky-50/60' : ''} ${
                          selectedRowShowsMismatch ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <td className="py-3 pr-3 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <span>{plan.description}</span>
                            {selectedRowShowsMismatch ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                Divergente
                              </span>
                            ) : null}
                            {isSyncingThisPlan ? (
                              <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                Sincronizando...
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 pr-3">{plan.type === 'EXPENSE' ? 'Despesa' : 'Receita'}</td>
                        <td className="py-3 pr-3">{plan.installmentCount}x</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col">
                            <span className={selectedRowShowsMismatch ? 'font-semibold text-amber-800' : ''}>
                              {formatBRL(plan.totalAmount)}
                            </span>
                            {selected ? (
                              planTotalCheckQuery.isLoading ? (
                                <span className="text-[11px] text-gray-400">Somando parcelas...</span>
                              ) : canComparePlanTotal ? (
                                <span
                                  className={`text-[11px] ${
                                    hasPlanTotalMismatch ? 'text-amber-700' : 'text-emerald-700'
                                  }`}
                                >
                                  Soma parcelas: {formatBRL(planInstallmentsSum)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">
                                  Soma parcial (nem todas as parcelas foram carregadas)
                                </span>
                              )
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 pr-3">{formatDateBR(plan.firstDueDate)}</td>
                        <td className="py-3 pr-3">{plan.intervalMonths} mes(es)</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlanId(plan.id)
                                setFilters((p) => ({ ...p, page: 1 }))
                              }}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                                selected ? 'border-primary text-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Eye size={13} />
                              Parcelas
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditPlanModal(plan)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={13} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletePlanTarget(plan)}
                              className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                              Excluir
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

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-base font-semibold text-gray-800">
            {selectedPlan ? `Parcelas da transação futura: ${selectedPlan.description}` : 'Parcelas da transação futura'}
          </h3>
          {selectedPlan ? (
            <button
              type="button"
              onClick={() => setSelectedPlanId(null)}
              className="text-xs rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50"
            >
              Fechar detalhes
            </button>
          ) : null}
        </div>

        {selectedPlan ? (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
              hasPlanTotalMismatch ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-gray-700">
                Total do plano: <strong>{formatBRL(selectedPlan.totalAmount)}</strong>
              </span>
              <span className="text-gray-700">
                Soma das parcelas:{' '}
                <strong>{planTotalCheckQuery.isLoading ? '...' : formatBRL(planInstallmentsSum)}</strong>
              </span>
              {canComparePlanTotal ? (
                <span className={hasPlanTotalMismatch ? 'text-amber-800' : 'text-emerald-700'}>
                  Diferença: <strong>{formatBRL(planTotalDifference)}</strong>
                </span>
              ) : (
                <span className="text-gray-500">Sem base completa para comparar totais.</span>
              )}

              {hasPlanTotalMismatch ? (
                <button
                  type="button"
                  onClick={onSyncPlanTotalWithInstallments}
                  disabled={syncingPlanId === selectedPlan.id || updatePlanMutation.isPending}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncingPlanId === selectedPlan.id ? 'Sincronizando...' : 'Sincronizar total com parcelas'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!selectedPlanId ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Selecione uma transação futura na lista acima para ver as parcelas.
          </div>
        ) : loadingInstallments ? (
          <Skeleton type="table" rows={8} />
        ) : installments.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">Nenhuma parcela encontrada para esta transação futura.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-3 pr-3">Descricao</th>
                    <th className="py-3 pr-3">Tipo</th>
                    <th className="py-3 pr-3">Parcela</th>
                    <th className="py-3 pr-3">Valor</th>
                    <th className="py-3 pr-3">Vencimento</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((item) => {
                    const effectiveStatus = calcEffectiveStatus(item)
                    const canSettle = effectiveStatus === 'pending' || effectiveStatus === 'overdue'

                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 pr-3 text-gray-800">{item.description}</td>
                        <td className="py-3 pr-3">{item.type === 'EXPENSE' ? 'Despesa' : 'Receita'}</td>
                        <td className="py-3 pr-3">
                          {item.installmentNumber}/{item.installmentCount}
                        </td>
                        <td className="py-3 pr-3 font-medium">{formatBRL(item.amount)}</td>
                        <td className="py-3 pr-3">{formatDateBR(item.dueDate)}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                              effectiveStatus
                            )}`}
                          >
                            {statusLabel(effectiveStatus)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {canSettle ? (
                              <button
                                type="button"
                                onClick={() => openSettleModal(item)}
                                className="inline-flex items-center gap-1 rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                              >
                                <CheckCircle2 size={14} />
                                Dar baixa
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => openEditInstallmentModal(item)}
                              disabled={effectiveStatus === 'settled'}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil size={13} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteInstallmentTarget(item)}
                              disabled={effectiveStatus === 'settled'}
                              className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              Excluir
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

      <Dialog open={planModalOpen} onClose={closePlanModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {planModalMode === 'edit' ? 'Editar Transação Futura' : 'Nova Transação Futura'}
              </DialogTitle>
              <button type="button" onClick={closePlanModal} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPlan(onSavePlan)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-gray-600">Descricao</span>
                <input {...registerPlan('description')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.description && <span className="text-xs text-red-600">{planErrors.description.message}</span>}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Tipo</span>
                <select {...registerPlan('type')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Pagamento</span>
                <select {...registerPlan('paymentType')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  {paymentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Valor total</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...registerPlan('totalAmount')}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                />
                {planErrors.totalAmount && <span className="text-xs text-red-600">{planErrors.totalAmount.message}</span>}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Quantidade de parcelas</span>
                <input
                  type="number"
                  min="1"
                  {...registerPlan('installmentCount')}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                />
                {planErrors.installmentCount && (
                  <span className="text-xs text-red-600">{planErrors.installmentCount.message}</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <CalendarDays size={14} />
                  Primeiro vencimento
                </span>
                <input type="date" {...registerPlan('firstDueDate')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {planErrors.firstDueDate && <span className="text-xs text-red-600">{planErrors.firstDueDate.message}</span>}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Intervalo (meses)</span>
                <input
                  type="number"
                  min="1"
                  {...registerPlan('intervalMonths')}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                />
                {planErrors.intervalMonths && (
                  <span className="text-xs text-red-600">{planErrors.intervalMonths.message}</span>
                )}
              </label>

              {planModalMode === 'edit' ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Status do plano</span>
                  <select {...registerPlan('status')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                    {planStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {planModalMode === 'edit' ? (
                <label className="md:col-span-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    {...registerPlan('recalculateRemaining')}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                  />
                  Recalcular parcelas abertas
                </label>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Categoria (opcional)</span>
                <select {...registerPlan('categoryId')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  <option value="">Sem categoria</option>
                  {(categoriesQuery.data ?? []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Cartao (opcional)</span>
                <select
                  {...registerPlan('cardId')}
                  disabled={watchedPaymentType !== 'CREDIT_CARD'}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm disabled:bg-gray-100"
                >
                  <option value="">Sem cartao</option>
                  {(cardQuery.data ?? []).map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-gray-600">Observacoes (opcional)</span>
                <textarea {...registerPlan('notes')} rows={3} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>

              <div className="md:col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                Valor aproximado por parcela: <strong>{formatBRL(approximateInstallmentValue)}</strong>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePlanModal}
                  className="h-10 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60"
                >
                  {isSavingPlan ? 'Salvando...' : planModalMode === 'edit' ? 'Salvar alteracoes' : 'Criar transação futura'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={settleModalOpen} onClose={closeSettleModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">Dar baixa na parcela</DialogTitle>
              <button type="button" onClick={closeSettleModal} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitSettle(onSettle)} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">{selectedInstallment?.description}</p>
                <p className="text-slate-600 mt-1">
                  Parcela {selectedInstallment?.installmentNumber}/{selectedInstallment?.installmentCount} -{' '}
                  {formatBRL(selectedInstallment?.amount ?? 0)}
                </p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Valor pago (opcional)</span>
                <input
                  type="text"
                  placeholder="Ex.: 250,00"
                  {...registerSettle('amount')}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                />
                {settleErrors.amount && (
                  <span className="text-xs text-red-600">{settleErrors.amount.message as string}</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Data do pagamento (opcional)</span>
                <input type="date" {...registerSettle('paidAt')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {settleErrors.paidAt && (
                  <span className="text-xs text-red-600">{settleErrors.paidAt.message as string}</span>
                )}
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeSettleModal}
                  className="h-10 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={settleInstallmentMutation.isPending}
                  className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60"
                >
                  {settleInstallmentMutation.isPending ? 'Salvando...' : 'Confirmar baixa'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog open={installmentEditModalOpen} onClose={closeInstallmentEditModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">Editar parcela</DialogTitle>
              <button type="button" onClick={closeInstallmentEditModal} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitInstallmentEdit(onSaveInstallment)} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">{editingInstallment?.description}</p>
                <p className="text-slate-600 mt-1">
                  Parcela {editingInstallment?.installmentNumber}/{editingInstallment?.installmentCount}
                </p>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Valor</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...registerInstallmentEdit('amount')}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                />
                {installmentEditErrors.amount && (
                  <span className="text-xs text-red-600">{installmentEditErrors.amount.message}</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Vencimento</span>
                <input type="date" {...registerInstallmentEdit('dueDate')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm" />
                {installmentEditErrors.dueDate && (
                  <span className="text-xs text-red-600">{installmentEditErrors.dueDate.message}</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Status</span>
                <select {...registerInstallmentEdit('status')} className="h-10 rounded-lg border border-gray-200 px-3 text-sm">
                  {installmentEditableStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {installmentEditErrors.status && (
                  <span className="text-xs text-red-600">{installmentEditErrors.status.message}</span>
                )}
              </label>

              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  {...registerInstallmentEdit('recalculateRemaining')}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                Recalcular parcelas seguintes
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeInstallmentEditModal}
                  className="h-10 rounded-full border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateInstallmentMutation.isPending}
                  className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-secondary disabled:opacity-60"
                >
                  {updateInstallmentMutation.isPending ? 'Salvando...' : 'Salvar parcela'}
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
        title="Excluir transação futura"
        description={`Deseja excluir "${deletePlanTarget?.description ?? ''}"? Essa acao nao pode ser desfeita.`}
        confirmLabel={deletePlanMutation.isPending ? 'Excluindo...' : 'Excluir'}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteInstallmentTarget)}
        onClose={() => setDeleteInstallmentTarget(null)}
        onConfirm={onDeleteInstallment}
        title="Excluir parcela"
        description={`Deseja excluir a parcela "${deleteInstallmentTarget?.description ?? ''}"? Essa acao nao pode ser desfeita.`}
        confirmLabel={deleteInstallmentMutation.isPending ? 'Excluindo...' : 'Excluir'}
      />
    </section>
  )
}
