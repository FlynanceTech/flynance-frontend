import axios from 'axios'
import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'
import { resolveDisplayDescription } from '@/utils/displayDescription'
import { FinancialDataScope, withFinancialScope } from '@/lib/financialScope'

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

export type FutureItemSourceType = 'installment_plan' | 'credit_card_statement_installment'
export type FutureItemStatus =
  | 'pending'
  | 'overdue'
  | 'open'
  | 'invoiced'
  | 'paid'
  | 'settled'
  | 'canceled'
  | 'PAID'
  | 'SETTLED'
  | 'CANCELED'

export interface FutureItem {
  id: string
  sourceType: FutureItemSourceType
  description: string | null
  type: 'INCOME' | 'EXPENSE' | null
  paymentType: string | null
  amount: number
  dueDate: string
  category: { id: string; name: string } | null
  card: { id: string; name: string; last4: string | null } | null
  status: FutureItemStatus
  installmentNumber: number
  installmentCount: number | null
  statement: {
    id: string
    cycleKey: string
    dueAt: string
    closingAt: string
    status: 'open' | 'invoiced' | 'paid' | 'PAID' | string
  } | null
}

export interface InvoiceGroup {
  card: { id: string; name: string; last4: string | null } | null
  statement: {
    id: string
    cycleKey: string
    dueAt: string
    closingAt: string
    status: string
  } | null
  items: FutureItem[]
  totalAmount: number
}

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
  scope?: FinancialDataScope
}

export interface ListInstallmentPlansParams {
  type?: FutureType
  from?: string
  to?: string
  page?: number
  limit?: number
  scope?: FinancialDataScope
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
  pendingCount: number
  // new fields from /future/forecast
  creditCardCount?: number
  installmentPlanCount?: number
  // backward-compat fields (may not be present in new API)
  overdueToPay?: number
  overdueToReceive?: number
  overdueCount?: number
}

export interface FutureForecastResponse {
  period: { start: string; end: string }
  totals: FutureForecastTotals
  upcoming: FutureItem[]
}

export type FutureForecast = FutureForecastResponse

type ApiRecord = Record<string, unknown>

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ApiRecord)
    : {}
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

function readableDescription(
  primary: unknown,
  fallback?: unknown,
  emptyLabel = 'Sem descricao'
) {
  return resolveDisplayDescription(primary, fallback, emptyLabel)
}

function parseMeta(payload: unknown, page = 1, limit = 10) {
  const payloadRecord = asRecord(payload)
  const metaRaw = asRecord(payloadRecord.meta ?? payloadRecord.pagination)
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

function parsePlan(row: unknown): FutureInstallmentPlan | null {
  if (!row) return null
  const record = asRecord(row)
  const category = asRecord(record.category)
  const card = asRecord(record.creditCard ?? record.card)
  const id = String(record.id ?? '')
  if (!id) return null

  return {
    id,
    status: (record.status ?? null) as FuturePlanStatus | string | null,
    type: (record.type ?? 'EXPENSE') as FutureType,
    paymentType: (record.paymentType ?? 'OTHER') as FuturePaymentType,
    cardId: nullableString(record.cardId),
    categoryId: nullableString(record.categoryId),
    description: readableDescription(record.description, category.name ?? card.name),
    totalAmount: Number(record.totalAmount ?? record.amount ?? 0),
    installmentCount: Number(record.installmentCount ?? record.totalInstallments ?? 1),
    firstDueDate: String(record.firstDueDate ?? record.firstDueAt ?? ''),
    intervalMonths: Number(record.intervalMonths ?? 1),
    notes: nullableString(record.notes),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  }
}

function parseInstallment(row: unknown): FutureInstallment | null {
  if (!row) return null

  const record = asRecord(row)
  const plan = asRecord(record.plan ?? record.installmentPlan)
  const category = asRecord(record.category ?? plan.category)
  const card = asRecord(record.creditCard ?? record.card ?? plan.creditCard ?? plan.card)
  const id = String(record.id ?? '')
  if (!id) return null

  const type = (record.type ?? plan.type ?? 'EXPENSE') as FutureType
  const status = (record.status ?? 'pending') as FutureStatus

  const amountRaw = record.amount ?? record.value ?? record.installmentAmount ?? record.expectedAmount ?? 0
  const installmentNumberRaw =
    record.installmentNumber ?? record.number ?? record.currentInstallment ?? record.parcel ?? 1
  const installmentCountRaw =
    record.installmentCount ?? record.totalInstallments ?? plan.installmentCount ?? record.total ?? 1

  return {
    id,
    planId: nullableString(record.planId ?? plan.id),
    description: readableDescription(record.description, plan.description ?? category.name ?? card.name),
    type,
    paymentType: (record.paymentType ?? plan.paymentType ?? null) as FuturePaymentType | null,
    categoryId: nullableString(record.categoryId ?? plan.categoryId),
    cardId: nullableString(record.cardId ?? plan.cardId),
    installmentNumber: Number(installmentNumberRaw || 1),
    installmentCount: Number(installmentCountRaw || 1),
    amount: Number(amountRaw || 0),
    dueDate: String(record.dueDate ?? record.dueAt ?? ''),
    status,
    paidAt: nullableString(record.paidAt ?? record.settledAt),
  }
}

function parseInstallmentsPayload(payload: unknown, page = 1, limit = 10): FutureInstallmentsResponse {
  const payloadRecord = asRecord(payload)
  const listRaw =
    payloadRecord.installments ??
    payloadRecord.data ??
    payloadRecord.items ??
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

function normalizeFutureItemDescription(item: FutureItem): FutureItem {
  return {
    ...item,
    description: readableDescription(
      item.description,
      item.category?.name ?? item.card?.name ?? null,
      'Lançamento futuro'
    ),
  }
}

function parsePlansPayload(payload: unknown, page = 1, limit = 50): FutureInstallmentPlansResponse {
  const payloadRecord = asRecord(payload)
  const listRaw =
    payloadRecord.plans ??
    payloadRecord.installmentPlans ??
    payloadRecord.data ??
    payloadRecord.items ??
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
    const response = await api.get('/future/installment-plans', {
      params: withFinancialScope({ ...params }, params.scope),
    })
    return parsePlansPayload(response.data, params.page ?? 1, params.limit ?? 50)
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 405)) {
      const installments = await getFutureInstallments({
        from: params.from,
        to: params.to,
        type: params.type,
        page: 1,
        limit: 1000,
        scope: params.scope,
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
    const response = await api.get('/future/installments', {
      params: withFinancialScope({ ...params }, params.scope),
    })
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
  scope?: FinancialDataScope
}): Promise<FutureForecastResponse> {
  try {
    const response = await api.get<FutureForecastResponse>('/future/forecast', {
      params: withFinancialScope(params, params?.scope),
    })
    return {
      ...response.data,
      upcoming: Array.isArray(response.data?.upcoming)
        ? response.data.upcoming.map(normalizeFutureItemDescription)
        : [],
    }
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao carregar previsao de futuros.')
    console.error('Erro ao carregar previsao de futuros:', msg)
    throw new Error(msg)
  }
}

export function groupCreditCardInvoices(upcoming: FutureItem[]): InvoiceGroup[] {
  const creditCardItems = upcoming.filter(
    (i) =>
      i.sourceType === 'credit_card_statement_installment' &&
      !['paid', 'settled', 'canceled'].includes(String(i.status ?? '').toLowerCase()) &&
      String(i.statement?.status ?? '').toLowerCase() !== 'paid'
  )
  const invoiceGroups = new Map<string, InvoiceGroup>()

  for (const item of creditCardItems) {
    const key = `${item.card?.id ?? 'unknown'}__${item.statement?.cycleKey ?? 'unknown'}`
    if (!invoiceGroups.has(key)) {
      invoiceGroups.set(key, {
        card: item.card,
        statement: item.statement,
        items: [],
        totalAmount: 0,
      })
    }
    const group = invoiceGroups.get(key)!
    group.items.push(item)
    group.totalAmount += item.amount
  }

  return [...invoiceGroups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort(
        (a, b) => Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0)
      ),
    }))
    .sort(
      (a, b) =>
        new Date(a.statement?.dueAt ?? 0).getTime() -
        new Date(b.statement?.dueAt ?? 0).getTime()
    )
}
