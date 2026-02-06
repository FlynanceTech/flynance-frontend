// src/services/categories.ts

import api from '@/lib/axios'
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


export const createCategory = async (data: CategoryDTO): Promise<CategoryResponse> => {
  try {
    const response = await api.post(`/category`, data)

    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao criar categoria.");
    console.error("Erro ao criar categoria:", msg);
    throw new Error(msg);
  }
}

export const getCategories = async (): Promise<CategoryResponse[]> => {
  try {
    const response = await api.get(`/categories`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao buscar categorias.");
    console.error("Erro ao buscar categorias:", msg);
    throw new Error(msg);
  }
}

export const updateCategory = async (id: string, data: CategoryDTO): Promise<CategoryResponse> => {
  try {
    const response = await api.put(`/category/${id}`, data)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao atualizar categoria.");
    console.error("Erro ao atualizar categoria:", msg);
    throw new Error(msg);
  }
}

export const deleteCategory = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/category/${id}`)
    return response.data
  } catch (e: unknown) {
    const msg = getErrorMessage(e, "Erro ao deletar categoria.");
    console.error("Erro ao deletar categoria:", msg);
    throw new Error(msg);
  }
}
