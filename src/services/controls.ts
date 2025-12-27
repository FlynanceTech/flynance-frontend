import api from '@/lib/axios'

export type PeriodType = 'monthly'
export type Channel = 'IN_APP' | 'EMAIL' | 'WHATSZAPP'

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
}

// Criar
export async function createControl(data: CreateControlDTO) {
  const res = await api.post<ControlResponse>('/controls', data)
  return res.data
}

// Listar (sem/ com progresso)
export async function getAllControls(withProgress = false) {
  const response = await api.get('/controls', { params: { withProgress } })
  return response.data
}

export async function getControlsById(id: string, date?: Date) {
  const params = date ? { date: date.toISOString().split('T')[0] } : {}
  const response = await api.get(`/controls/${id}`, { params })
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
export async function getFavoriteControls() {
  const res = await api.get<ControlResponse[]>('/controls/favorites')
  return res.data
}
