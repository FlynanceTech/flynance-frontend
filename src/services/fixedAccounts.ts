import api from '@/lib/axios'
import { FinancialDataScope, withFinancialScope } from '@/lib/financialScope'
import { getErrorMessage } from '@/utils/getErrorMessage'
import axios from 'axios'

export type FixedAccountStatus = 'active' | 'paused' | 'canceled'

export type FixedAccountFrequency = 'weekly' | 'monthly' | 'yearly'
export type FixedAccountCycleStatus = 'PAID' | 'PENDING' | 'OVERDUE'

type ServiceError = Error & { status?: number }

function buildServiceError(e: unknown, fallback: string): ServiceError {
  const msg = getErrorMessage(e, fallback)
  const error = new Error(msg) as ServiceError
  if (axios.isAxiosError(e)) {
    error.status = e.response?.status
  }
  return error
}

export interface FixedAccountPayment {
  id: string
  fixedAccountId?: string
  userId?: string
  transactionId?: string | null
  amount: number
  paidAt: string
  dueDate?: string | null
  periodKey?: string
  createdAt?: string
}

export interface FixedAccountDTO {
  name: string
  amount: number
  currency?: string
  categoryId?: string | null
  dueDay: number
  dueDate?: string
  frequency?: FixedAccountFrequency
  startDate: string
  endDate?: string | null
  autoPay?: boolean
  status?: FixedAccountStatus
  notes?: string
}

export interface FixedAccountResponse {
  id: string
  userId?: string
  name: string
  amount: number
  currency?: string
  categoryId?: string | null
  dueDay: number
  dueDate?: string
  frequency?: FixedAccountFrequency
  startDate?: string
  endDate?: string | null
  autoPay?: boolean
  status?: FixedAccountStatus
  notes?: string
  isPaid?: boolean
  payment?: FixedAccountPayment | null // legado
  paymentCurrentCycle?: FixedAccountPayment | null
  lastPayment?: FixedAccountPayment | null
  payments?: FixedAccountPayment[]
  statusCurrentCycle?: FixedAccountCycleStatus
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
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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
    const serviceError = buildServiceError(e, 'Erro ao criar conta fixa.')
    console.error('Erro ao criar conta fixa:', serviceError.message)
    throw serviceError
  }
}

export async function getFixedAccounts(params?: {
  status?: FixedAccountStatus
  categoryId?: string
  periodStart?: string
  periodEnd?: string
}, scope?: FinancialDataScope): Promise<FixedAccountResponse[]> {
  try {
    if (typeof window !== 'undefined') {
      console.debug('[fixed-accounts] GET /fixed-accounts', params ?? {})
    }
    const response = await api.get('/fixed-accounts', { params: withFinancialScope(params, scope) })
    if (typeof window !== 'undefined') {
      console.debug('[fixed-accounts] response', response.status, response.data)
    }
    return response.data
  } catch (e: unknown) {
    const serviceError = buildServiceError(e, 'Erro ao buscar contas fixas.')
    console.error('Erro ao buscar contas fixas:', serviceError.message)
    if (typeof window !== 'undefined') {
      console.debug('[fixed-accounts] error', e)
    }
    throw serviceError
  }
}

export async function getFixedAccount(
  id: string,
  scope?: FinancialDataScope
): Promise<FixedAccountResponse> {
  try {
    const response = await api.get(`/fixed-accounts/${id}`, {
      params: withFinancialScope(undefined, scope),
    })
    return response.data
  } catch (e: unknown) {
    const serviceError = buildServiceError(e, 'Erro ao buscar conta fixa.')
    console.error('Erro ao buscar conta fixa:', serviceError.message)
    throw serviceError
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
    const serviceError = buildServiceError(e, 'Erro ao atualizar conta fixa.')
    console.error('Erro ao atualizar conta fixa:', serviceError.message)
    throw serviceError
  }
}

export async function deleteFixedAccount(id: string): Promise<{ message: string }> {
  try {
    const response = await api.delete(`/fixed-accounts/${id}`)
    return response.data
  } catch (e: unknown) {
    const serviceError = buildServiceError(e, 'Erro ao remover conta fixa.')
    console.error('Erro ao remover conta fixa:', serviceError.message)
    throw serviceError
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
    const serviceError = buildServiceError(e, 'Erro ao marcar conta fixa como paga.')
    console.error('Erro ao marcar conta fixa como paga:', serviceError.message)
    throw serviceError
  }
}

export async function unmarkFixedAccountPaid(id: string, periodKey: string): Promise<{ ok: true }> {
  try {
    const response = await api.put(`/fixed-accounts/${id}/unmark-paid`, { periodKey })
    return response.data
  } catch (e: unknown) {
    const serviceError = buildServiceError(e, 'Erro ao desmarcar pagamento da conta fixa.')
    console.error('Erro ao desmarcar pagamento da conta fixa:', serviceError.message)
    throw serviceError
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

export async function getFixedAccountPayments(
  id: string,
  scope?: FinancialDataScope
): Promise<FixedAccountPaymentResponse[]> {
  try {
    const response = await api.get(`/fixed-accounts/${id}/payments`, {
      params: withFinancialScope(undefined, scope),
    })
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao buscar Histórico de pagamentos.')
    console.error('Erro ao buscar Histórico de pagamentos:', msg)
    throw buildServiceError(e, 'Erro ao buscar Historico de pagamentos.')
  }
}
