import api from '@/lib/axios'

export type PeriodType = "monthly"
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
}

// Criar
export async function createControl(data: CreateControlDTO) {
  const res = await api.post<ControlResponse>('/controls', data)
  return res.data
}

// Listar (sem/ com progresso? use params se quiser)
export async function getAllControls(withProgress = false) {
  const response = await api.get('/controls', { params: { withProgress } });
  return response.data;
}

export async function getControlsById(id: string, date?: Date) {
  const params = date
    ? { date: date.toISOString().split('T')[0] } 
    : {}

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
