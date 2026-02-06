import api from "@/lib/axios"
import { Transaction } from "@/types/Transaction"
import { getErrorMessage } from "@/utils/getErrorMessage"

export type PaymentType =
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'PIX'
  | 'BOLETO'
  | 'TED'
  | 'DOC'
  | 'MONEY'
  | 'CASH'
  | 'OTHER'

export interface TransactionDTO {
  value: number,
  description: string,
  categoryId: string,
  date: string,
  type: 'EXPENSE' | 'INCOME',
  origin: 'DASHBOARD' | 'TEXT' | 'IMAGE' | 'AUDIO' | 'CHATBOT'
  paymentType: PaymentType
  cardId?: string
}

type Primitive = string | number | boolean
type FilterValue = Primitive | Primitive[] | undefined

export type TransactionFilterMode = 'days' | 'month'

export type TransactionFilters = {
  mode?: TransactionFilterMode
  days?: number
  month?: string // '05'
  year?: string  // '2026'
  search?: string
  categoryIds?: string[] // no request vira "a,b,c"
  type?: 'ALL' | 'INCOME' | 'EXPENSE'
}

export type GetTransactionParams = {
  userId: string
  page?: number
  limit?: number
  filters?: TransactionFilters
}

export type GetTransactionResponse<TTransaction = any> = {
  transactions: TTransaction[]
  meta: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

export async function getTransaction({
  userId,
  page = 1,
  limit = 10,
  filters,
}: GetTransactionParams) {
  const params = new URLSearchParams()
  params.set('userId', userId)
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (filters) {
    if (filters.mode) params.set('mode', filters.mode)

    if (filters.mode === 'month') {
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
    } else {
      // default days
      if (filters.days != null) params.set('days', String(filters.days))
    }

    if (filters.search) params.set('search', filters.search)

    if (filters.categoryIds?.length) {
      params.set('categoryIds', filters.categoryIds.join(','))
    }

    if (filters.type && filters.type !== 'ALL') {
      params.set('type', filters.type)
    }

  }
  const response = await api.get(`/transactions?${params.toString()}`)

  // ✅ compat: se algum endpoint antigo ainda devolver array, normaliza
  if (Array.isArray(response.data)) {
    return {
      transactions: response.data,
      meta: { page, limit, total: response.data.length, hasNext: false },
    }
  }

  return response.data
}

export const createTransaction = async (data: TransactionDTO): Promise<Transaction> => {
  try {
    // ⚠️ normaliza sempre para ISO completo
    const payload: TransactionDTO = {
      ...data,
      date: new Date(data.date).toISOString(),
    }

    const response = await api.post(`/transactions`, payload)
    return response.data
  } catch (e: unknown) {
    console.error("Erro bruto ao criar transações:", e) // ajuda a debugar
    const msg = getErrorMessage(e, "Erro ao criar transações.")
    console.error("Erro ao criar transações:", msg)
    throw new Error(msg)
  }
}

export const updateTransaction = async (id: string, data: TransactionDTO): Promise<Transaction> => {
  try {
    const response = await api.put(`/transactions/${id}`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao atualizar transações.");
    console.error("Erro ao atualizar transações:", msg);
    throw new Error(msg);
  }
}

export const deleteTransaction = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  }catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao deletar transações.");
    console.error("Erro ao deletar transações:", msg);
    throw new Error(msg)
  }
}

export type ImportTransactionsResponse<TTransaction = any> =
  | { transactions: TTransaction[] }
  | TTransaction[]

export type ImportTransactionsPreviewResponse<TTransaction = any> =
  | { transactions: TTransaction[] }
  | TTransaction[]

export const importTransactions = async (
  userId: string,
  file: File
): Promise<ImportTransactionsResponse<Transaction>> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    if (typeof window !== 'undefined') {
      console.debug('[importTransactions] file', {
        name: file?.name,
        size: file?.size,
        type: file?.type,
      })
    }

    const response = await api.post(`/transactions/import/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao importar transações.")
    console.error("Erro ao importar transações:", msg)
    throw new Error(msg)
  }
}

export const importTransactionsPreview = async (
  userId: string,
  file: File
): Promise<ImportTransactionsPreviewResponse<Transaction>> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post(`/transactions/import/preview/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao pré-visualizar transações.")
    console.error("Erro ao pré-visualizar transações:", msg)
    throw new Error(msg)
  }
}

export type ImportConfirmPayload<TTransaction = any> = {
  mode: 'import'
  transactions: TTransaction[]
}

export const importTransactionsConfirm = async (
  userId: string,
  payload: ImportConfirmPayload
): Promise<ImportTransactionsResponse<Transaction>> => {
  try {
    const response = await api.post(`/transactions/import/confirm/${userId}`, payload, {
      headers: { 'Content-Type': 'application/json' },
    })
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao confirmar importacao.')
    console.error('Erro ao confirmar importacao:', msg)
    throw new Error(msg)
  }
}
