'use client'

import React, { useMemo, useState } from 'react'
import Header from '../components/Header'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { useFixedAccounts } from '@/hooks/query/useFixedAccounts'
import { CategorySelect } from '../components/CategorySelect'
import { useCategories } from '@/hooks/query/useCategory'
import type { CategoryDTO, CategoryResponse } from '@/services/category'
import type { CreateCategoryDraft } from '../components/Categories/createCategoryModal'
import { useRouter } from 'next/navigation'

type FixedBill = {
  id: string
  name: string
  amount: number
  dueDay: number
  notes?: string
  currency?: string
  status?: 'active' | 'paused' | 'canceled'
  autoPay?: boolean
  startDate?: string
  endDate?: string | null
  categoryId?: string | null
  categoryName?: string | null
  isPaid?: boolean
  payment?: {
    amount?: number
    paidAt?: string
    dueDate?: string | null
    periodKey?: string
  } | null
}

type FilterKey = 'all' | 'paid' | 'pending'

function toBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function formatDateBR(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR')
}

function todayISODate() {
  return new Date().toISOString().split('T')[0]
}

function monthKeyFromDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getMonthKeyFromISO(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return monthKeyFromDate(d)
}

function getCycleInfo(dueDay: number, leadDays = 10, now = new Date()) {
  const currentMonthDue = new Date(now.getFullYear(), now.getMonth(), dueDay)
  const boundary = new Date(currentMonthDue)
  boundary.setDate(boundary.getDate() - leadDays)

  let cycleYear = now.getFullYear()
  let cycleMonth = now.getMonth()
  if (now < boundary) {
    const prev = new Date(currentMonthDue)
    prev.setMonth(prev.getMonth() - 1)
    cycleYear = prev.getFullYear()
    cycleMonth = prev.getMonth()
  }

  const cycleDueDate = new Date(cycleYear, cycleMonth, dueDay)
  const cycleKey = monthKeyFromDate(cycleDueDate)

  return { cycleKey, cycleDueDate }
}

export default function FixedBillsPage() {
  const router = useRouter()
  const { fixedAccountsQuery, createMutation, updateMutation, deleteMutation, markPaidMutation, unmarkPaidMutation } =
    useFixedAccounts()
  const {
    categoriesQuery: { data: categories = [] },
    createMutation: createCategoryMutation,
  } = useCategories()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [payConfirmOpen, setPayConfirmOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<FixedBill | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISODate())

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null)

  const isPaid = (bill: FixedBill) => !!bill.isPaid

  const computeIsPaid = (bill: FixedBill) => {
    if (!bill.payment) return !!bill.isPaid

    const { cycleKey } = getCycleInfo(bill.dueDay)
    const paymentMonthKey =
      bill.payment.periodKey ||
      getMonthKeyFromISO(bill.payment.dueDate ?? undefined) ||
      getMonthKeyFromISO(bill.payment.paidAt)
    return !!paymentMonthKey && paymentMonthKey === cycleKey
  }

  const bills = useMemo(() => {
    const data = fixedAccountsQuery.data ?? []
    return data
      .map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDay: b.dueDay,
        notes: b.notes,
        currency: b.currency,
        status: b.status,
        autoPay: b.autoPay,
        startDate: b.startDate,
        endDate: b.endDate,
        categoryId: b.category?.id ?? null,
        categoryName: b.category?.name ?? null,
        isPaid: computeIsPaid({
          id: b.id,
          name: b.name,
          amount: b.amount,
          dueDay: b.dueDay,
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
        } as FixedBill),
        payment: b.payment ?? null,
      }))
      .sort((a, b) => a.dueDay - b.dueDay)
  }, [fixedAccountsQuery.data])

  const summary = useMemo(() => {
    const paid = bills.filter((b) => isPaid(b)).length
    const pending = bills.length - paid
    return { paid, pending, total: bills.length }
  }, [bills])

  const visibleBills = useMemo(() => {
    if (filter === 'paid') return bills.filter((b) => isPaid(b))
    if (filter === 'pending') return bills.filter((b) => !isPaid(b))
    return bills
  }, [bills, filter])

  const selectedCategoryObj = useMemo<CategoryResponse | null>(() => {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId) ?? null
  }, [categories, categoryId])

  const resetForm = () => {
    setName('')
    setAmount('')
    setDueDay('10')
    setNotes('')
    setCategoryId('')
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const parsedAmount = Number(amount)
    const parsedDueDay = Number(dueDay)
    if (!trimmed || Number.isNaN(parsedAmount) || parsedAmount <= 0) return
    if (!parsedDueDay || parsedDueDay < 1 || parsedDueDay > 31) return

    const createPayload = {
      name: trimmed,
      amount: parsedAmount,
      dueDay: parsedDueDay,
      startDate: todayISODate(),
      categoryId: categoryId || undefined,
      notes: notes.trim() || undefined,
    }

    if (editingBill?.id) {
      const updatePayload = {
        name: trimmed,
        amount: parsedAmount,
        dueDay: parsedDueDay,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
      }
      updateMutation.mutate(
        { id: editingBill.id, data: updatePayload },
        {
          onSuccess: () => {
            resetForm()
            closeDrawer()
          },
        }
      )
      return
    }

    createMutation.mutate(createPayload, {
      onSuccess: () => {
        resetForm()
        closeDrawer()
      },
    })
  }

  const handleEdit = (bill: FixedBill) => {
    setEditingBill(bill)
    setName(bill.name ?? '')
    setAmount(String(bill.amount ?? ''))
    setDueDay(String(bill.dueDay ?? '10'))
    setNotes(bill.notes ?? '')
    setCategoryId((bill.categoryId as string) ?? '')
    setDrawerOpen(true)
  }

  const openPayConfirm = (bill: FixedBill) => {
    setPayTarget(bill)
    setPayAmount(String(bill.payment?.amount ?? bill.amount ?? ''))
    setPayDate(todayISODate())
    setPayConfirmOpen(true)
  }

  const handleConfirmPay = () => {
    if (!payTarget) return
    const parsedAmount = Number(payAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    const paidAtDate = payDate ? new Date(payDate) : new Date()
    const { cycleDueDate } = getCycleInfo(payTarget.dueDay, 10, paidAtDate)
    const cycleDueISO = cycleDueDate.toISOString().split('T')[0]
    markPaidMutation.mutate({
      id: payTarget.id,
      data: {
        amount: parsedAmount,
        paidAt: payDate || todayISODate(),
        dueDate: cycleDueISO,
      },
    })
    setPayConfirmOpen(false)
    setPayTarget(null)
  }

  const closePayConfirm = () => {
    setPayConfirmOpen(false)
    setPayTarget(null)
    setPayDate(todayISODate())
  }

  const togglePaid = (id: string, bill: FixedBill) => {
    if (!isPaid(bill)) {
      openPayConfirm(bill)
      return
    }

    const periodKey =
      bill.payment?.periodKey ??
      (bill.payment?.paidAt ? monthKeyFromDate(new Date(bill.payment.paidAt)) : monthKeyFromDate())

    unmarkPaidMutation.mutate({ id, periodKey })
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
      <Header title="Contas Fixas" subtitle="Controle de pagamentos fixos do mes." newTransation={false} />

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#333C4D]">Minhas contas fixas</h2>
              <p className="text-sm text-slate-500">
                Pagas: <strong>{summary.paid}</strong> • Pendentes: <strong>{summary.pending}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                Nenhuma conta fixa cadastrada.
              </div>
            )}

            {visibleBills.map((bill) => {
              const paid = isPaid(bill)
              const { cycleDueDate } = getCycleInfo(bill.dueDay)
              const { cycleKey } = getCycleInfo(bill.dueDay)
              const overdue = !paid && new Date() > cycleDueDate
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0 gap-1">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{bill.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>Vence todo dia {bill.dueDay}</span>
                      {/*   <span>{toBRL(bill.amount)}</span>
                        {bill.currency && bill.currency !== 'BRL' && (
                          <>
                            <span>•</span>
                            <span>{bill.currency}</span>
                          </>
                        )} */}
                        {bill.categoryName && (
                          <>
                            <span>•</span>
                            <span>{bill.categoryName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                        <span>Competência: {cycleKey}</span>
                        <span>•</span>
                        <span>
                          Status: {paid ? 'Paga' : overdue ? 'Atrasada' : bill.status === 'active' ? 'Ativa' : bill.status === 'paused' ? 'Pausada' : 'Cancelada'}
                        </span>
                       {/*  {bill.autoPay != null && (
                          <>
                            <span>•</span>
                            <span>Auto: {bill.autoPay ? 'Sim' : 'Não'}</span>
                          </>
                        )} */}
                        {bill.startDate && (
                          <>
                            <span>•</span>
                            <span>Início: {formatDateBR(bill.startDate)}</span>
                          </>
                        )}
                        {bill.endDate && (
                          <>
                            <span>•</span>
                            <span>Fim: {formatDateBR(bill.endDate)}</span>
                          </>
                        )}
                      </div>
                      {bill.notes && (
                        <span className="text-xs text-gray-400 mt-1 truncate">{bill.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(bill)
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePaid(bill.id, bill)
                      }}
                      className={clsx(
                        'inline-flex items-center cursor-pointer gap-2 rounded-full px-3 py-1 text-xs font-semibold border',
                        paid
                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Check className="h-3 w-3" />
                      {paid ? 'Desmarcar pagamento' : 'Marcar como pago'}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        requestDelete(bill.id)
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border border-gray-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                </div>
              )
            })}
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
                onChange={(e) => setPayAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="mt-2 w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                placeholder="0,00"
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
              >
                Confirmar pagamento
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
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                  placeholder="Ex: Internet, Aluguel"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600">Categoria</label>
                <CategorySelect
                  value={selectedCategoryObj}
                  onChange={(cat) => setCategoryId((cat as CategoryResponse | null)?.id ?? '')}
                  typeFilter="EXPENSE"
                  placeholder="Selecione uma categoria"
                  allowCreate
                  onCreateCategory={handleCreateCategory}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600">Valor aproximado.</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600">Vencimento</label>
                  <input
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    type="number"
                    min="1"
                    max="31"
                    className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                    placeholder="Dia"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600">Observacao</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm"
                  placeholder="Opcional"
                />
              </div>
              <span className="text-xs text-gray-500">* Valores aproximados</span>
              <button
                type="submit"
                className="w-full mt-4 bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-full cursor-pointer disabled:opacity-60"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvando...'
                  : editingBill
                  ? 'Salvar alteraÃ§Ãµes'
                  : 'Adicionar conta fixa'}
              </button>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </section>
  )
}
