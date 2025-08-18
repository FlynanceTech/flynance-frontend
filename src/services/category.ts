// src/services/categories.ts

import api from '@/lib/axios'

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
  keywords: Keyword[]   // ← CORREÇÃO AQUI
  accountId?: string | null
  createdAt?: string
  updatedAt?: string
}


export const createCategory = async (data: CategoryDTO): Promise<CategoryResponse> => {
  try {
    const response = await api.post(`/category`, data)

    return response.data
  } catch (error: any) {
    console.error('Erro ao criar categoria:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao criar categoria.')
  }
}

export const getCategories = async (): Promise<CategoryResponse[]> => {
  try {
    const response = await api.get(`/categories`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao buscar categorias.')
  }
}

export const updateCategory = async (id: string, data: CategoryDTO): Promise<CategoryResponse> => {
  try {
    const response = await api.put(`/category/${id}`, data)
    return response.data
  } catch (error: any) {
    console.error('Erro ao atualizar categoria:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao atualizar categoria.')
  }
}

export const deleteCategory = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/category/${id}`)
    return response.data
  } catch (error: any) {
    console.error('Erro ao deletar categoria:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Erro ao deletar categoria.')
  }
}
