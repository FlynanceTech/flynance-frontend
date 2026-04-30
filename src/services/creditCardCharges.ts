import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export interface CreditCardChargeInstallmentItem {
  id: string
  installmentNumber: number
  amount: number
  statementMonthKey: string
  statementDueAt: string
  statementClosingAt: string
  status: 'open' | 'invoiced' | 'paid' | 'canceled' | string
}

export interface CreditCardChargeItem {
  id: string
  cardId: string
  userId: string
  description: string
  purchaseDate: string
  amountTotal: number
  installmentCount: number
  merchant: string | null
  notes: string | null
  status: 'posted' | 'voided' | 'refunded' | 'disputed' | string
  category: { id: string; name: string; color: string; icon: string } | null
  creditCard: { id: string; name: string; last4: string | null } | null
  createdByUser: { id: string; name: string | null; email: string | null } | null
  installments: CreditCardChargeInstallmentItem[]
}

export interface CreditCardChargesResponse {
  charges: CreditCardChargeItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
  }
}

export interface CreateCreditCardChargeDTO {
  description: string
  categoryId: string
  value: number
  purchaseDate: string
  installmentCount?: number
  merchant?: string
  notes?: string
}

export async function getCreditCardCharges(params: {
  cardId?: string
  categoryId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}): Promise<CreditCardChargesResponse> {
  try {
    const searchParams = new URLSearchParams()
    if (params.cardId) searchParams.set('cardId', params.cardId)
    if (params.categoryId) searchParams.set('categoryId', params.categoryId)
    if (params.from) searchParams.set('from', params.from)
    if (params.to) searchParams.set('to', params.to)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))

    const response = await api.get(`/cards/charges?${searchParams.toString()}`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao buscar gastos de cartão.')
    console.error('Erro ao buscar gastos de cartão:', msg)
    throw new Error(msg)
  }
}

export interface UpdateCreditCardChargeDTO {
  description?: string
  categoryId?: string
  purchaseDate?: string
}

export async function updateCreditCardCharge(
  chargeId: string,
  data: UpdateCreditCardChargeDTO
): Promise<CreditCardChargeItem> {
  try {
    const response = await api.put(`/cards/charges/${chargeId}`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao atualizar gasto no cartão.')
    console.error('Erro ao atualizar gasto:', msg)
    throw new Error(msg)
  }
}

export async function deleteCreditCardCharge(chargeId: string): Promise<void> {
  try {
    await api.delete(`/cards/charges/${chargeId}`)
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao excluir gasto no cartão.')
    console.error('Erro ao excluir gasto:', msg)
    throw new Error(msg)
  }
}

export async function createCreditCardCharge(
  cardId: string,
  data: CreateCreditCardChargeDTO
): Promise<CreditCardChargeItem> {
  try {
    const response = await api.post(`/cards/${cardId}/charges`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao registrar gasto no cartão.')
    console.error('Erro ao registrar gasto no cartão:', msg)
    throw new Error(msg)
  }
}
