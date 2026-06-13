import api from '@/lib/axios'
import axios from 'axios'
import { getErrorMessage } from '@/utils/getErrorMessage'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BudgetClassification = 'INCOME' | 'ESSENTIAL_EXPENSE' | 'NON_ESSENTIAL_EXPENSE' | 'NEUTRAL'

export type BudgetCategory = {
  id: string
  name: string
  icon: string
  color: string
  type: string
  classification: BudgetClassification
  classificationOrder: number
  nominalLimit: number | null
  percentLimit: number | null
  limitId: string | null
  keywordsCount?: number
  userId?: string | null
}

export type CreateCategoryPayload = {
  name: string
  icon?: string
  color?: string
  type?: string
  classification?: BudgetClassification
  keywords?: string[]
}

export type ClassLimit = {
  id: string
  class: BudgetClassification
  nominalLimit: number | null
  percentLimit: number | null
}

export type BudgetPlan = {
  id: string
  monthYear: string
  totalBudget: number | null
  totalBudgetPct: number | null
  notes: string | null
  isActive: boolean
  classLimits: ClassLimit[]
}

export type BudgetPlanResponse = {
  plan: BudgetPlan
  categories: BudgetCategory[]
  monthlyIncome: number
  monthYear: string
}

export type CategoryProgressItem = {
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  classification: BudgetClassification
  nominalLimit: number | null
  percentLimit: number | null
  spent: number
  remaining: number | null
  pct: number | null
  status: 'ok' | 'warning' | 'danger' | 'exceeded' | 'no-limit'
}

export type ClassProgressItem = {
  class: BudgetClassification
  spent: number
  limit: number | null
  pct: number | null
  status: 'ok' | 'warning' | 'danger' | 'exceeded' | 'no-limit'
}

export type BudgetProgressResponse = {
  monthYear: string
  monthlyIncome: number
  totalBudget: number | null
  totalBudgetPct: number | null
  totalSpent: number
  overallPct: number | null
  overallStatus: 'ok' | 'warning' | 'danger' | 'exceeded' | 'no-limit'
  categoryProgress: CategoryProgressItem[]
  classProgress: ClassProgressItem[]
}

export type SetClassLimitsPayload = {
  monthYear?: string
  limits: Array<{
    class: BudgetClassification
    nominalLimit?: number | null
    percentLimit?: number | null
  }>
}

export type SetCategoryLimitsPayload = {
  monthYear?: string
  limits: Array<{
    categoryId: string
    nominalLimit?: number | null
    percentLimit?: number | null
  }>
}

// ─── Error handling ───────────────────────────────────────────────────────────

function toBudgetError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    const msg = data?.error ?? data?.message
    if (msg) return msg
    const status = error.response?.status
    if (status === 401) return 'Sua sessão expirou. Faça login novamente.'
    if (status === 403) return 'Sem permissão para acessar este plano.'
  }
  return getErrorMessage(error, fallback)
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getBudgetPlan(clientUserId: string, monthYear?: string): Promise<BudgetPlanResponse> {
  try {
    const query = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : ''
    const res = await api.get(`/advisor/clients/${clientUserId}/budget-plan${query}`)
    return res.data
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao carregar plano orçamentário.'))
  }
}

export async function upsertPlanSettings(
  clientUserId: string,
  data: { monthYear?: string; totalBudget?: number | null; totalBudgetPct?: number | null; notes?: string | null }
): Promise<{ plan: BudgetPlan }> {
  try {
    const res = await api.put(`/advisor/clients/${clientUserId}/budget-plan`, data)
    return res.data
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao salvar configurações do plano.'))
  }
}

export async function setClassLimits(clientUserId: string, payload: SetClassLimitsPayload): Promise<void> {
  try {
    await api.put(`/advisor/clients/${clientUserId}/budget-plan/class-limits`, payload)
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao salvar limites por grupo.'))
  }
}

export async function setCategoryLimits(clientUserId: string, payload: SetCategoryLimitsPayload): Promise<void> {
  try {
    await api.put(`/advisor/clients/${clientUserId}/budget-plan/category-limits`, payload)
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao salvar limites por categoria.'))
  }
}

export async function getBudgetProgress(clientUserId: string, monthYear?: string): Promise<BudgetProgressResponse> {
  try {
    const query = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : ''
    const res = await api.get(`/advisor/clients/${clientUserId}/budget-plan/progress${query}`)
    return res.data
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao carregar progresso do plano.'))
  }
}

export async function createClientCategory(
  clientUserId: string,
  data: CreateCategoryPayload
): Promise<BudgetCategory> {
  try {
    const res = await api.post(`/advisor/clients/${clientUserId}/categories`, data)
    return res.data
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao criar categoria.'))
  }
}

export async function updateClientCategory(
  clientUserId: string,
  categoryId: string,
  data: Partial<CreateCategoryPayload>
): Promise<BudgetCategory> {
  try {
    const res = await api.patch(`/advisor/clients/${clientUserId}/categories/${categoryId}`, data)
    return res.data
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao atualizar categoria.'))
  }
}

export async function deleteClientCategory(clientUserId: string, categoryId: string): Promise<void> {
  try {
    await api.delete(`/advisor/clients/${clientUserId}/categories/${categoryId}`)
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao excluir categoria.'))
  }
}

export async function updateClientCategoryClassification(
  clientUserId: string,
  categoryId: string,
  classification: BudgetClassification,
  order?: number
): Promise<void> {
  try {
    await api.patch(`/advisor/clients/${clientUserId}/categories/${categoryId}/classification`, { classification, order })
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao atualizar classificação.'))
  }
}

/**
 * Sincroniza os limites do budget plan do advisor com os GoalControls do cliente.
 * O backend cria/atualiza os controles com managedByAdvisorId preenchido,
 * garantindo idempotência (não duplica se chamado múltiplas vezes).
 */
export async function syncBudgetToGoalControls(
  clientUserId: string,
  monthYear?: string
): Promise<void> {
  try {
    const query = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : ''
    await api.post(`/advisor/clients/${clientUserId}/budget-plan/sync-controls${query}`)
  } catch (error) {
    throw new Error(toBudgetError(error, 'Erro ao sincronizar metas com o planejamento.'))
  }
}
