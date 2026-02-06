import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type FixedAccountStatus = 'active' | 'paused' | 'canceled'

export type FixedAccountFrequency = 'weekly' | 'monthly' | 'yearly'

export interface FixedAccountDTO {
  name: string
  amount: number
  currency?: string
  categoryId?: string | null
  dueDay: number
  frequency?: FixedAccountFrequency
  startDate: string
  endDate?: string | null
  autoPay?: boolean
  status?: FixedAccountStatus
  notes?: string
}

export interface FixedAccountResponse {
  id: string
  name: string
  amount: number
  currency?: string
  categoryId?: string | null
  dueDay: number
  frequency?: FixedAccountFrequency
  startDate?: string
  endDate?: string | null
  autoPay?: boolean
  status?: FixedAccountStatus
  notes?: string
  isPaid?: boolean
  payment?: {
    id: string
    amount: number
    paidAt: string
    dueDate?: string | null
    periodKey?: string
    createdAt?: string
  } | null
  category?: {
    id: string
    name: string
    color?: string
    icon?: string
    type?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

function todayISODate() {
  return new Date().toISOString().split('T')[0]
}

export async function createFixedAccount(data: FixedAccountDTO): Promise<FixedAccountResponse> {
  try {
    const trimmedName = data.name?.trim()
    if (!trimmedName) {
      throw new Error('Nome obrigatorio.')
    }
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      throw new Error('Valor deve ser maior que 0.')
    }
    if (!Number.isFinite(data.dueDay) || data.dueDay < 1 || data.dueDay > 31) {
      throw new Error('Dia de vencimento invalido.')
    }
    if (!data.startDate) {
      throw new Error('Data de inicio obrigatoria.')
    }
    const payload: FixedAccountDTO = {
      currency: 'BRL',
      frequency: 'monthly',
      autoPay: false,
      status: 'active',
      endDate: null,
      ...data,
      startDate: data.startDate ?? todayISODate(),
      name: trimmedName,
    }
    const response = await api.post('/fixed-accounts', payload)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao criar conta fixa.')
    console.error('Erro ao criar conta fixa:', msg)
    throw new Error(msg)
  }
}

export async function getFixedAccounts(params?: {
  status?: FixedAccountStatus
  categoryId?: string
  periodStart?: string
  periodEnd?: string
}): Promise<FixedAccountResponse[]> {
  try {
    if (typeof window !== 'undefined') {
      console.debug('[fixed-accounts] GET /fixed-accounts', params ?? {})
    }
    const response = await api.get('/fixed-accounts', { params })
    if (typeof window !== 'undefined') {
      console.debug('[fixed-accounts] response', response.status, response.data)
    }
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao buscar contas fixas.')
    console.error('Erro ao buscar contas fixas:', msg)
    if (typeof window !== 'undefined') {
      console.debug('[fixed-accounts] error', e)
    }
    throw new Error(msg)
  }
}

export async function updateFixedAccount(
  id: string,
  data: Partial<FixedAccountDTO>
): Promise<FixedAccountResponse> {
  try {
    const response = await api.put(`/fixed-accounts/${id}`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao atualizar conta fixa.')
    console.error('Erro ao atualizar conta fixa:', msg)
    throw new Error(msg)
  }
}

export async function deleteFixedAccount(id: string): Promise<{ message: string }> {
  try {
    const response = await api.delete(`/fixed-accounts/${id}`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao remover conta fixa.')
    console.error('Erro ao remover conta fixa:', msg)
    throw new Error(msg)
  }
}

export async function markFixedAccountPaid(
  id: string,
  data?: { amount?: number; paidAt?: string; dueDate?: string }
): Promise<FixedAccountResponse> {
  try {
    const response = await api.put(`/fixed-accounts/${id}/mark-paid`, data ?? {})
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao marcar conta fixa como paga.')
    console.error('Erro ao marcar conta fixa como paga:', msg)
    throw new Error(msg)
  }
}

export async function unmarkFixedAccountPaid(id: string, periodKey: string): Promise<{ ok: true }> {
  try {
    const response = await api.put(`/fixed-accounts/${id}/unmark-paid`, { periodKey })
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao desmarcar pagamento da conta fixa.')
    console.error('Erro ao desmarcar pagamento da conta fixa:', msg)
    throw new Error(msg)
  }
}

export interface FixedAccountPaymentResponse {
  id: string
  fixedAccountId: string
  userId: string
  transactionId: string | null
  amount: number
  paidAt: string
  dueDate: string
  periodKey: string
  createdAt: string
}

export async function getFixedAccountPayments(id: string): Promise<FixedAccountPaymentResponse[]> {
  try {
    const response = await api.get(`/fixed-accounts/${id}/payments`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao buscar histÃ³rico de pagamentos.')
    console.error('Erro ao buscar histÃ³rico de pagamentos:', msg)
    throw new Error(msg)
  }
}
