// src/services/cards.ts

import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OTHER'

export interface CreditCardDTO {
  name: string
  brand: CardBrand
  last4?: string
  limit: number
  closingDay: number
  dueDay: number
  timezone?: string
}

export interface CreditCardResponse {
  id: string
  userId: string
  name: string
  brand: CardBrand
  last4: string | null
  limit: number
  closingDay: number
  dueDay: number
  timezone: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreditCardUpdateDTO {
  name?: string
  brand?: CardBrand
  last4?: string
  limit?: number
  closingDay?: number
  dueDay?: number
  timezone?: string
  isActive?: boolean
}

/** ---- Summary (fatura atual) ---- */
export interface CardSummaryCategory {
  categoryId: string | null
  total: number
}

export interface CardSummaryResponse {
  card: {
    id: string
    name: string
    brand: CardBrand
    last4: string | null
    limit: number
    closingDay: number
    dueDay: number
    timezone: string | null
  }
  cycle: {
    start: string
    end: string
    daysInCycle: number
  }
  metrics: {
    spent: number
    remaining: number
    utilPct: number
    dailyAvg: number
    projected: number
    overLimit: boolean
  }
  topCategories: CardSummaryCategory[]
}

/** Create */
export const createCard = async (data: CreditCardDTO): Promise<CreditCardResponse> => {
  try {
    const res = await api.post('/cards', data)
    return res.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao criar cartão.')
    console.error('Erro ao criar cartão:', msg)
    throw new Error(msg)
  }
}

/** Read (list) */
export const getCards = async (): Promise<CreditCardResponse[]> => {
  try {
    const res = await api.get('/cards')
    return res.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao buscar cartões.')
    console.error('Erro ao buscar cartões:', msg)
    throw new Error(msg)
  }
}

/** Update */
export const updateCard = async (id: string, data: CreditCardUpdateDTO): Promise<CreditCardResponse> => {
  try {
    const res = await api.put(`/cards/${id}`, data)
    return res.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao atualizar cartão.')
    console.error('Erro ao atualizar cartão:', msg)
    throw new Error(msg)
  }
}

/** Delete */
export const deleteCard = async (id: string): Promise<{ message: string }> => {
  try {
    const res = await api.delete(`/cards/${id}`)
    return res.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao deletar cartão.')
    console.error('Erro ao deletar cartão:', msg)
    throw new Error(msg)
  }
}

/** Summary (fatura atual do cartão) */
export const getCardSummary = async (id: string, tz?: string): Promise<CardSummaryResponse> => {
  try {
    const res = await api.get(`/cards/${id}/summary`, { params: tz ? { tz } : undefined })
    return res.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, 'Erro ao carregar resumo do cartão.')
    console.error('Erro ao carregar resumo do cartão:', msg)
    throw new Error(msg)
  }
}
