import api from "@/lib/axios"
import { Transaction } from "@/types/Transaction"
import { getErrorMessage } from "@/utils/getErrorMessage"

export type PaymentType = 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'MONEY'


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


interface GetTransactionParams {
  userId: string;
  page?: number;
  limit?: number;
  filters?: Record<string, string | number | boolean | undefined>;
}

export async function getTransaction({ userId, page = 1, limit = 10, filters = {} }: GetTransactionParams) {
  const params = new URLSearchParams({ userId, page: String(page), limit: String(limit) });
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  });
  const response = await api.get(`/transactions?${params.toString()}`);
  return response.data;
}


export const createTransaction = async (data: TransactionDTO): Promise<Transaction> => {
  try {
    const response = await api.post(`/transactions`, data)

    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao criar transações.");
    console.error("Erro ao criar transações:", msg);
    throw new Error(msg);
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