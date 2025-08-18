// stores/useCategoryStore.ts
import { create } from 'zustand'
import { CategoryResponse } from '@/services/category'

interface CategoryState {
  categoryStore: CategoryResponse[]
  setCategoryStore: (data: CategoryResponse[]) => void
  getCategoryById: (id: string) => CategoryResponse | undefined
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categoryStore: [],
  setCategoryStore: (data) => set({ categoryStore: data }),
  getCategoryById: (id) => get().categoryStore.find((cat) => cat.id === id),
}))
