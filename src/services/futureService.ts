import axios from 'axios'
import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type FutureType = 'EXPENSE' | 'INCOME'

export type FuturePaymentType =
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'PIX'
  | 'BOLETO'
  | 'TED'
  | 'DOC'
  | 'MONEY'
  | 'CASH'
  | 'OTHER'

export type FutureStatus = 'pending' | 'overdue' | 'settled' | 'canceled'
export type FutureEditableInstallmentStatus = 'pending' | 'canceled'
export type FuturePlanStatus = 'active' | 'completed' | 'canceled'

export interface CreateInstallmentPlanDTO {
  type: FutureType
  paymentType: FuturePaymentType
  cardId?: string | null
  categoryId?: string | null
  description: string
  totalAmount: number
  installmentCount: number
  firstDueDate: string
  intervalMonths?: number
  notes?: string | null
}

export type UpdateInstallmentPlanDTO = Partial<CreateInstallmentPlanDTO>
export type UpdateInstallmentDTO = {
  amount?: number
  dueDate?: string
  status?: FutureEditableInstallmentStatus
  recalculateRemaining?: boolean
}

export type UpdateInstallmentPlanPayload = UpdateInstallmentPlanDTO & {
  status?: FuturePlanStatus
  recalculateRemaining?: boolean
}

export interface SettleInstallmentDTO {
  amount?: number
  paidAt?: string
}

export interface ListInstallmentsParams {
  planId?: string
  type?: FutureType
  status?: FutureStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface ListInstallmentPlansParams {
  type?: FutureType
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface FutureInstallmentPlan {
  id: string
  status?: FuturePlanStatus | string | null
  type: FutureType
  paymentType: FuturePaymentType
  cardId?: string | null
  categoryId?: string | null
  description: string
  totalAmount: number
  installmentCount: number
  firstDueDate: string
  intervalMonths: number
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface FutureInstallment {
  id: string
  planId?: string | null
  description: string
  type: FutureType
  paymentType?: FuturePaymentType | null
  categoryId?: string | null
  cardId?: string | null
  installmentNumber: number
  installmentCount: number
  amount: number
  dueDate: string
  status: FutureStatus
  paidAt?: string | null
}

export interface FutureInstallmentsResponse {
  installments: FutureInstallment[]
  meta: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

export interface FutureInstallmentPlansResponse {
  plans: FutureInstallmentPlan[]
  meta: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

export interface FutureForecastTotals {
  toPay: number
  toReceive: number
  overdueToPay: number
  overdueToReceive: number
  pendingCount: number
  overdueCount: number
}

export interface FutureForecastResponse {
  period: { start: string; end: string }
  totals: FutureForecastTotals
  upcoming: FutureInstallment[]
}

function parseMeta(payload: any, page = 1, limit = 10) {
  const metaRaw = payload?.meta ?? payload?.pagination ?? {}
  const total = Number(metaRaw.total ?? 0)
  const pageOut = Number(metaRaw.page ?? page)
  const limitOut = Number(metaRaw.limit ?? limit)
  const hasNext =
    typeof metaRaw.hasNext === 'boolean'
      ? metaRaw.hasNext
      : pageOut * limitOut < total

  return {
    page: pageOut,
    limit: limitOut,
    total,
    hasNext,
  }
}

function parsePlan(row: any): FutureInstallmentPlan | null {
  if (!row) return null
  const id = String(row.id ?? '')
  if (!id) return null

  return {
    id,
    status: (row.status ?? null) as FuturePlanStatus | string | null,
    type: (row.type ?? 'EXPENSE') as FutureType,
    paymentType: (row.paymentType ?? 'OTHER') as FuturePaymentType,
    cardId: row.cardId ?? null,
    categoryId: row.categoryId ?? null,
    description: String(row.description ?? 'Sem descricao'),
    totalAmount: Number(row.totalAmount ?? row.amount ?? 0),
    installmentCount: Number(row.installmentCount ?? row.totalInstallments ?? 1),
    firstDueDate: String(row.firstDueDate ?? row.firstDueAt ?? ''),
    intervalMonths: Number(row.intervalMonths ?? 1),
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function parseInstallment(row: any): FutureInstallment | null {
  if (!row) return null

  const plan = row.plan ?? row.installmentPlan ?? {}
  const id = String(row.id ?? '')
  if (!id) return null

  const type = (row.type ?? plan.type ?? 'EXPENSE') as FutureType
  const status = (row.status ?? 'pending') as FutureStatus

  const amountRaw = row.amount ?? row.value ?? row.installmentAmount ?? row.expectedAmount ?? 0
  const installmentNumberRaw =
    row.installmentNumber ?? row.number ?? row.currentInstallment ?? row.parcel ?? 1
  const installmentCountRaw =
    row.installmentCount ?? row.totalInstallments ?? plan.installmentCount ?? row.total ?? 1

  return {
    id,
    planId: row.planId ?? plan.id ?? null,
    description: String(row.description ?? plan.description ?? 'Sem descricao'),
    type,
    paymentType: (row.paymentType ?? plan.paymentType ?? null) as FuturePaymentType | null,
    categoryId: row.categoryId ?? plan.categoryId ?? null,
    cardId: row.cardId ?? plan.cardId ?? null,
    installmentNumber: Number(installmentNumberRaw || 1),
    installmentCount: Number(installmentCountRaw || 1),
    amount: Number(amountRaw || 0),
    dueDate: String(row.dueDate ?? row.dueAt ?? ''),
    status,
    paidAt: row.paidAt ?? row.settledAt ?? null,
  }
}

function parseInstallmentsPayload(payload: any, page = 1, limit = 10): FutureInstallmentsResponse {
  const listRaw =
    payload?.installments ??
    payload?.data ??
    payload?.items ??
    (Array.isArray(payload) ? payload : [])

  const installments = (Array.isArray(listRaw) ? listRaw : [])
    .map(parseInstallment)
    .filter(Boolean) as FutureInstallment[]

  const meta = parseMeta(payload, page, limit)
  if (meta.total === 0) {
    meta.total = installments.length
  }

  return { installments, meta }
}

function parsePlansPayload(payload: any, page = 1, limit = 50): FutureInstallmentPlansResponse {
  const listRaw =
    payload?.plans ??
    payload?.installmentPlans ??
    payload?.data ??
    payload?.items ??
    (Array.isArray(payload) ? payload : [])

  const plans = (Array.isArray(listRaw) ? listRaw : [])
    .map(parsePlan)
    .filter(Boolean) as FutureInstallmentPlan[]

  const meta = parseMeta(payload, page, limit)
  if (meta.total === 0) {
    meta.total = plans.length
  }

  return { plans, meta }
}

function derivePlansFromInstallments(
  installments: FutureInstallment[],
  page = 1,
  limit = 50
): FutureInstallmentPlansResponse {
  const grouped = new Map<string, FutureInstallmentPlan>()

  for (const i of installments) {
    const key = i.planId || `${i.description}|${i.type}|${i.installmentCount}|${i.amount}`
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, {
        id: i.planId || `derived-${key}`,
        type: i.type,
        paymentType: (i.paymentType ?? 'OTHER') as FuturePaymentType,
        cardId: i.cardId ?? null,
        categoryId: i.categoryId ?? null,
        description: i.description,
        totalAmount: Number(i.amount || 0) * Number(i.installmentCount || 1),
        installmentCount: i.installmentCount,
        firstDueDate: i.dueDate,
        intervalMonths: 1,
        notes: null,
      })
      continue
    }

    if (i.dueDate && (!existing.firstDueDate || new Date(i.dueDate) < new Date(existing.firstDueDate))) {
      existing.firstDueDate = i.dueDate
    }
  }

  const all = Array.from(grouped.values())
  const start = (Math.max(1, page) - 1) * Math.max(1, limit)
  const plans = all.slice(start, start + Math.max(1, limit))

  return {
    plans,
    meta: {
      page,
      limit,
      total: all.length,
      hasNext: start + limit < all.length,
    },
  }
}

export async function createInstallmentPlan(data: CreateInstallmentPlanDTO) {
  try {
    const response = await api.post('/future/installment-plans', data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao criar parcelamento futuro.')
    console.error('Erro ao criar parcelamento futuro:', msg)
    throw new Error(msg)
  }
}

export async function updateInstallmentPlan(id: string, data: UpdateInstallmentPlanPayload) {
  try {
    const response = await api.put(`/future/installment-plans/${id}`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao atualizar parcelamento futuro.')
    console.error('Erro ao atualizar parcelamento futuro:', msg)
    throw new Error(msg)
  }
}

export async function deleteInstallmentPlan(
  id: string
): Promise<{ ok: boolean; id: string; deleted: boolean }> {
  try {
    const response = await api.delete(`/future/installment-plans/${id}`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao excluir parcelamento futuro.')
    console.error('Erro ao excluir parcelamento futuro:', msg)
    throw new Error(msg)
  }
}

export async function getFutureInstallmentPlans(
  params: ListInstallmentPlansParams
): Promise<FutureInstallmentPlansResponse> {
  try {
    const response = await api.get('/future/installment-plans', { params })
    return parsePlansPayload(response.data, params.page ?? 1, params.limit ?? 50)
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 405)) {
      const installments = await getFutureInstallments({
        from: params.from,
        to: params.to,
        type: params.type,
        page: 1,
        limit: 1000,
      })
      return derivePlansFromInstallments(
        installments.installments,
        params.page ?? 1,
        params.limit ?? 50
      )
    }

    const msg = getErrorMessage(e, 'Erro ao listar parcelamentos futuros.')
    console.error('Erro ao listar parcelamentos futuros:', msg)
    throw new Error(msg)
  }
}

export async function getFutureInstallments(
  params: ListInstallmentsParams
): Promise<FutureInstallmentsResponse> {
  try {
    const response = await api.get('/future/installments', { params })
    return parseInstallmentsPayload(response.data, params.page ?? 1, params.limit ?? 10)
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao buscar parcelas futuras.')
    console.error('Erro ao buscar parcelas futuras:', msg)
    throw new Error(msg)
  }
}

export async function settleFutureInstallment(id: string, body?: SettleInstallmentDTO) {
  try {
    const response = await api.put(`/future/installments/${id}/settle`, body ?? {})
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao dar baixa na parcela.')
    console.error('Erro ao dar baixa na parcela:', msg)
    throw new Error(msg)
  }
}

export async function updateFutureInstallment(id: string, data: UpdateInstallmentDTO) {
  try {
    const response = await api.put(`/future/installments/${id}`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao atualizar parcela.')
    console.error('Erro ao atualizar parcela:', msg)
    throw new Error(msg)
  }
}

export async function deleteFutureInstallment(id: string) {
  try {
    const response = await api.delete(`/future/installments/${id}`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao excluir parcela.')
    console.error('Erro ao excluir parcela:', msg)
    throw new Error(msg)
  }
}

export async function updateInstallment(id: string, data: UpdateInstallmentDTO) {
  return updateFutureInstallment(id, data)
}

export async function deleteInstallment(id: string) {
  return deleteFutureInstallment(id)
}

export async function getFutureForecast(params?: {
  from?: string
  to?: string
  days?: number
}): Promise<FutureForecastResponse> {
  try {
    const response = await api.get<FutureForecastResponse>('/future/forecast', { params })
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao carregar previsao de futuros.')
    console.error('Erro ao carregar previsao de futuros:', msg)
    throw new Error(msg)
  }
}
