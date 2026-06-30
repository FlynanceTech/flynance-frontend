import api from '@/lib/axios'
import { FinancialDataScope, withFinancialScope } from '@/lib/financialScope'

export type PeriodType = 'monthly'
export type Channel = 'IN_APP' | 'EMAIL' | 'WHATSAPP'

export interface CreateControlDTO {
  categoryId: string | null
  goal: number
  periodType: PeriodType
  resetDay: number | null
  includeSubcategories: boolean
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: Channel[]
}

export interface ControlResponse {
  id: string
  userId?: string
  accountId?: string
  categoryId: string | null
  goal: number
  periodType: PeriodType
  resetDay: number | null
  resetWeekday: number | null
  includeSubcategories: boolean
  carryOver: boolean
  notify: boolean
  notifyAtPct: number[]
  channels: Channel[]
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  favoriteAt?: string | null
  /** Definido quando este controle foi criado pelo Advisor (cliente não pode editar/excluir) */
  managedByAdvisorId?: string | null
}

// Criar
export async function createControl(data: CreateControlDTO) {
  const res = await api.post<ControlResponse>('/controls', data)
  return res.data
}

// Listar (sem/ com progresso)
export async function getAllControls(
  withProgress = false,
  date?: Date,
  scope?: FinancialDataScope
) {
  const params: Record<string, unknown> = { withProgress }
  if (date) {
    params.date = date.toISOString().split('T')[0]
  }
  const response = await api.get('/controls', { params: withFinancialScope(params, scope) })
  return response.data
}

export async function getControlsById(id: string, date?: Date, scope?: FinancialDataScope) {
  const params = date ? { date: date.toISOString().split('T')[0] } : undefined
  const response = await api.get(`/controls/${id}`, {
    params: withFinancialScope(params, scope),
  })
  return response.data
}

// Atualizar
export async function updateControl(id: string, data: Partial<CreateControlDTO>) {
  const res = await api.put<ControlResponse>(`/controls/${id}`, data)
  return res.data
}

// Remover
export async function deleteControl(id: string) {
  await api.delete(`/controls/${id}`)
}

/** ⭐ Favoritos (máx 3) */
export async function setControlFavorite(params: {
  id: string
  isFavorite: boolean
  replaceId?: string
}) {
  const { id, isFavorite, replaceId } = params
  const res = await api.put<ControlResponse>(`/controls/${id}/favorites`, {
    isFavorite,
    ...(replaceId ? { replaceId } : {}),
  })
  return res.data
}

/** Lista top 3 favoritos (pra Home, etc.) */
export async function getFavoriteControls(scope?: FinancialDataScope) {
  const res = await api.get<ControlResponse[]>('/controls/favorites', {
    params: withFinancialScope(undefined, scope),
  })
  return res.data
}
