import api from "@/lib/axios"

export interface CreateControlDTO {
  categoryId: string
  goal: number
  limit: number
  periodType?: "MONTHLY" | "WEEKLY" | "BIMONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY"
  alert?: boolean
}

export interface ControlResponse {
  period: "monthly" | "weekly" | "bimonthly" | "quarterly" | "half_yearly" | "annually"
  id: string
  categoryId: string
  goal: number
  limit: number
  periodType?: "MONTHLY" | "WEEKLY" | "BIMONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY"
  alert: boolean
  createdAt: string
  updatedAt: string
}

// Criar controle
export async function createControl(data: CreateControlDTO) {
  const response = await api.post<ControlResponse>('/controls', data)
  return response.data
}

// Listar todos os controles
export async function getAllControls(): Promise<ControlResponse[]> {
  const response = await api.get('/controls')
  return response.data
}

// Atualizar controle
export async function updateControl(id: string, data: Partial<CreateControlDTO>) {
  const response = await api.put<ControlResponse>(`/controls/${id}`, data)
  return response.data
}

// Deletar controle
export async function deleteControl(id: string) {
  const response = await api.delete(`/controls/${id}`)
  return response.data
}
