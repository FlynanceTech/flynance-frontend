// src/services/categories.ts

import api from '@/lib/axios'
import { FinancialDataScope } from '@/lib/financialScope'
import { getErrorMessage } from '@/utils/getErrorMessage'

import { IconName } from '@/utils/icon-map'

export interface Keyword {
  id: string
  name: string
  categoryId: string
}

export interface CategoryDTO {
  name: string
  color: string
  icon: IconName
  keywords: string[]
  type: string
}

export interface CategoryResponse {
  id: string
  name: string
  color: string
  icon: IconName
  type: string
  period: string
  keywords: Keyword[]
  userId?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CategoryClassification =
  | 'INCOME'
  | 'ESSENTIAL_EXPENSE'
  | 'NON_ESSENTIAL_EXPENSE'
  | 'NEUTRAL'

export interface CategoryClassificationItem extends CategoryResponse {
  classification: CategoryClassification
  classificationOrder: number
  hasCustomClassification: boolean
}

export interface CategoryClassificationColumn {
  classification: CategoryClassification
  total: number
  items: CategoryClassificationItem[]
}

export interface CategoryClassificationBoardResponse {
  columns: CategoryClassificationColumn[]
  skippedCategoryIds?: string[]
}

export interface CategoryClassificationUpdateItem {
  categoryId: string
  classification: CategoryClassification
  order: number
}

export interface CategoryClassificationUpdatePayload {
  items: CategoryClassificationUpdateItem[]
}

export interface CategoryClassificationReorderPayload {
  classification: CategoryClassification
  categoryIds: string[]
}

export interface CategoryClassificationPatchPayload {
  classification: CategoryClassification
  order: number
}

export type ClassificationRequestOptions = {
  actingClientId?: string | null
  scope?: FinancialDataScope | null
}

const CLASSIFICATION_ITEM_PREFIX = 'classification-item:'

function buildClassificationRequestConfig(options?: ClassificationRequestOptions) {
  const actingClientId = options?.actingClientId?.trim()
  const params: Record<string, string> = {}
  const headers: Record<string, string> = {}

  if (actingClientId) {
    headers['x-client-user-id'] = actingClientId
    params.userId = actingClientId
  }

  if (options?.scope) {
    params.scope = options.scope
  }

  if (Object.keys(headers).length === 0 && Object.keys(params).length === 0) {
    return undefined
  }

  return {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    params: Object.keys(params).length > 0 ? params : undefined,
  }
}

function normalizeCategoryErrorMessage(e: unknown, fallback: string) {
  const message = getErrorMessage(e, fallback).trim()
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized.startsWith('nao foi possivel')) return message
  if (normalized.startsWith('limite')) return message
  return fallback
}

export function normalizeClassificationCategoryId(raw: string): string | null {
  let value = String(raw ?? '').trim()
  if (!value) return null

  while (value.startsWith(CLASSIFICATION_ITEM_PREFIX)) {
    value = value.slice(CLASSIFICATION_ITEM_PREFIX.length)
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function sanitizeClassificationBoardResponse(
  board: CategoryClassificationBoardResponse
): CategoryClassificationBoardResponse {
  const normalizedSkippedIds = Array.from(
    new Set(
      (board.skippedCategoryIds ?? [])
        .map((id) => normalizeClassificationCategoryId(id))
        .filter((id): id is string => Boolean(id))
    )
  )
  const skippedIdSet = new Set(normalizedSkippedIds)

  const columns = (board.columns ?? []).map((column) => {
    const seenIds = new Set<string>()

    const items = [...(column.items ?? [])]
      .sort((a, b) => (a.classificationOrder ?? 0) - (b.classificationOrder ?? 0))
      .map((item) => {
        const normalizedId = normalizeClassificationCategoryId(item.id)
        if (!normalizedId) return null
        if (skippedIdSet.has(normalizedId)) return null
        if (seenIds.has(normalizedId)) return null
        seenIds.add(normalizedId)

        return {
          ...item,
          id: normalizedId,
          classification: column.classification,
        }
      })
      .filter((item): item is CategoryClassificationItem => Boolean(item))
      .map((item, index) => ({
        ...item,
        classificationOrder: index + 1,
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        hasCustomClassification: Boolean(item.hasCustomClassification),
      }))

    return {
      ...column,
      total: items.length,
      items,
    }
  })

  return {
    columns,
    skippedCategoryIds: normalizedSkippedIds,
  }
}


export const createCategory = async (
  data: CategoryDTO,
  options?: ClassificationRequestOptions
): Promise<CategoryResponse> => {
  try {
    const response = await api.post(`/category`, data, buildClassificationRequestConfig(options))

    return response.data
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel criar a categoria. Tente novamente.'
    )
    console.error("Erro ao criar categoria:", msg);
    throw new Error(msg);
  }
}

export const getCategories = async (
  options?: ClassificationRequestOptions
): Promise<CategoryResponse[]> => {
  try {
    const response = await api.get(`/categories`, buildClassificationRequestConfig(options))
    return response.data
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel carregar as categorias. Tente novamente.'
    )
    console.error("Erro ao buscar categorias:", msg);
    throw new Error(msg);
  }
}

export const updateCategory = async (
  id: string,
  data: CategoryDTO,
  options?: ClassificationRequestOptions
): Promise<CategoryResponse> => {
  try {
    const response = await api.put(
      `/category/${id}`,
      data,
      buildClassificationRequestConfig(options)
    )
    return response.data
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel salvar a categoria. Tente novamente.'
    )
    console.error("Erro ao atualizar categoria:", msg);
    throw new Error(msg);
  }
}

export const deleteCategory = async (
  id: string,
  options?: ClassificationRequestOptions
): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/category/${id}`, buildClassificationRequestConfig(options))
    return response.data
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel excluir a categoria. Tente novamente.'
    )
    console.error("Erro ao deletar categoria:", msg);
    throw new Error(msg);
  }
}

export const getCategoriesClassificationBoard = async (
  options?: ClassificationRequestOptions
): Promise<CategoryClassificationBoardResponse> => {
  try {
    const response = await api.get(
      '/categories/classification',
      buildClassificationRequestConfig(options)
    )
    return sanitizeClassificationBoardResponse(response.data)
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel carregar a classificacao das categorias. Tente novamente.'
    )
    console.error('Erro ao buscar classificacao de categorias:', msg)
    throw new Error(msg)
  }
}

export const updateCategoriesClassificationBoard = async (
  data: CategoryClassificationUpdatePayload,
  options?: ClassificationRequestOptions
): Promise<CategoryClassificationBoardResponse> => {
  try {
    const response = await api.put(
      '/categories/classification',
      data,
      buildClassificationRequestConfig(options)
    )
    return sanitizeClassificationBoardResponse(response.data)
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel salvar a classificacao das categorias. Tente novamente.'
    )
    console.error('Erro ao salvar classificacao de categorias:', msg)
    throw new Error(msg)
  }
}

export const updateCategoryClassification = async (
  categoryId: string,
  data: CategoryClassificationPatchPayload,
  options?: ClassificationRequestOptions
): Promise<CategoryClassificationBoardResponse> => {
  try {
    const response = await api.patch(
      `/categories/${categoryId}/classification`,
      data,
      buildClassificationRequestConfig(options)
    )
    return sanitizeClassificationBoardResponse(response.data)
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel salvar a classificacao da categoria. Tente novamente.'
    )
    console.error('Erro ao salvar classificacao de categoria:', msg)
    throw new Error(msg)
  }
}

export const reorderCategoryClassificationColumn = async (
  data: CategoryClassificationReorderPayload,
  options?: ClassificationRequestOptions
): Promise<CategoryClassificationBoardResponse> => {
  try {
    const response = await api.patch(
      '/categories/classification/reorder',
      data,
      buildClassificationRequestConfig(options)
    )
    return sanitizeClassificationBoardResponse(response.data)
  } catch (e: unknown) {
    const msg = normalizeCategoryErrorMessage(
      e,
      'Nao foi possivel reordenar as categorias. Tente novamente.'
    )
    console.error('Erro ao reordenar classificacao de categorias:', msg)
    throw new Error(msg)
  }
}
