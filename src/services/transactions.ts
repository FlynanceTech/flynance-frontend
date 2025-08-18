import api from "@/lib/axios"
import { Transaction } from "@/types/Transaction"

export interface TransactionDTO {
  value: number,
  description: string,
  categoryId: string,
  date: string,
  type: 'EXPENSE' | 'INCOME',
  origin: 'DASHBOARD' | 'TEXT' | 'IMAGE' | 'AUDIO' 
}


export async function getTransaction({
  userId,
  page = 1,
  limit = 10,
  filters = {},
}: {
  userId: string
  page?: number
  limit?: number
  filters?: Record<string, any>
}) {
  const params = new URLSearchParams({
    userId,
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  })

  const response = await api.get(`/transactions?${params.toString()}`)
  return response.data
}


export const createTransaction = async (data: TransactionDTO): Promise<Transaction> => {
  try {
    const response = await api.post(`/transactions`, data)

    return response.data
  } catch (error: any) {
    console.error('Erro ao criar transações:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao criar transações.')
  }
}

export const updateTransaction = async (id: string, data: TransactionDTO): Promise<Transaction> => {
  try {
    const response = await api.put(`/transactions/${id}`, data)
    return response.data
  } catch (error: any) {
    console.error('Erro ao atualizar transações:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao atualizar transações.')
  }
}

export const deleteTransaction = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao deletar transações:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao deletar transações.')
  }
}