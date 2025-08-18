import { CategoryResponse } from '@/services/category'
import { create } from 'zustand'

type FilterMode = 'days' | 'month'

interface FiltroTransacoesStore {
  selectedCategories: CategoryResponse[]
  dateRange: number
  searchTerm: string
  mode: FilterMode
  selectedMonth: string // formato: '05'
  selectedYear: string  // formato: '2025'

  setSelectedCategories: (cats: CategoryResponse[]) => void
  setDateRange: (value: number) => void
  setSearchTerm: (termo: string) => void
  setMode: (mode: FilterMode) => void
  setSelectedMonth: (month: string) => void
  setSelectedYear: (year: string) => void
  limparFiltros: () => void
}

export const useTransactionFilter = create<FiltroTransacoesStore>((set) => ({
  selectedCategories: [],
  dateRange: 30,
  searchTerm: '',
  mode: 'days',
  selectedMonth: '',
  selectedYear: '',

  setSelectedCategories: (categorias) => set({ selectedCategories: categorias }),
  setDateRange: (periodo) => set({ dateRange: periodo }),
  setSearchTerm: (termo) => set({ searchTerm: termo }),
  setMode: (mode) => set({ mode }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  limparFiltros: () =>
    set({
      selectedCategories: [],
      dateRange: 30,
      searchTerm: '',
      mode: 'days',
      selectedMonth: '',
      selectedYear: '',
    }),
}))
