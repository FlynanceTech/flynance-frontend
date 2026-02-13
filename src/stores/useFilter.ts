import { CategoryResponse } from '@/services/category'
import { create } from 'zustand'

type FilterMode = 'days' | 'month'
type TxTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'
interface FiltroTransacoesStore {
  selectedCategories: CategoryResponse[]
  dateRange: number
  searchTerm: string
  mode: FilterMode
  includeFuture: boolean
  selectedMonth: string // formato: '05'
  selectedYear: string  // formato: '2025'
  typeFilter: TxTypeFilter
  appliedSelectedCategories: CategoryResponse[]
  appliedDateRange: number
  appliedSearchTerm: string
  appliedMode: FilterMode
  appliedIncludeFuture: boolean
  appliedSelectedMonth: string
  appliedSelectedYear: string
  appliedTypeFilter: TxTypeFilter
  setIncludeFuture: (value: boolean) => void
  setTypeFilter: (v: TxTypeFilter) => void
  setSelectedCategories: (cats: CategoryResponse[]) => void
  setDateRange: (value: number) => void
  setSearchTerm: (termo: string) => void
  setMode: (mode: FilterMode) => void
  setSelectedMonth: (month: string) => void
  setSelectedYear: (year: string) => void
  setAppliedTypeFilter: (v: TxTypeFilter) => void
  setAppliedSelectedCategories: (cats: CategoryResponse[]) => void
  setAppliedDateRange: (value: number) => void
  setAppliedSearchTerm: (termo: string) => void
  setAppliedMode: (mode: FilterMode) => void
  setAppliedIncludeFuture: (value: boolean) => void
  setAppliedSelectedMonth: (month: string) => void
  setAppliedSelectedYear: (year: string) => void
  applyFilters: () => void
  limparFiltros: () => void
}

export const useTransactionFilter = create<FiltroTransacoesStore>((set) => ({
  selectedCategories: [],
  dateRange: 30,
  searchTerm: '',
  mode: 'days',
  includeFuture: false,
  selectedMonth: '',
  selectedYear: '',
  typeFilter: 'ALL',
  appliedSelectedCategories: [],
  appliedDateRange: 30,
  appliedSearchTerm: '',
  appliedMode: 'days',
  appliedIncludeFuture: false,
  appliedSelectedMonth: '',
  appliedSelectedYear: '',
  appliedTypeFilter: 'ALL',
  setIncludeFuture: (value) => set({ includeFuture: value }),
  setTypeFilter: (v) => set({ typeFilter: v }),
  setSelectedCategories: (categorias) => set({ selectedCategories: categorias }),
  setDateRange: (periodo) => set({ dateRange: periodo }),
  setSearchTerm: (termo) => set({ searchTerm: termo }),
  setMode: (mode) => set({ mode }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setAppliedTypeFilter: (v) => set({ appliedTypeFilter: v, typeFilter: v }),
  setAppliedSelectedCategories: (categorias) =>
    set({ appliedSelectedCategories: categorias, selectedCategories: categorias }),
  setAppliedDateRange: (periodo) => set({ appliedDateRange: periodo, dateRange: periodo }),
  setAppliedSearchTerm: (termo) => set({ appliedSearchTerm: termo, searchTerm: termo }),
  setAppliedMode: (mode) => set({ appliedMode: mode, mode }),
  setAppliedIncludeFuture: (value) => set({ appliedIncludeFuture: value, includeFuture: value }),
  setAppliedSelectedMonth: (month) =>
    set({ appliedSelectedMonth: month, selectedMonth: month }),
  setAppliedSelectedYear: (year) => set({ appliedSelectedYear: year, selectedYear: year }),
  applyFilters: () =>
    set((state) => ({
      appliedSelectedCategories: state.selectedCategories,
      appliedDateRange: state.dateRange,
      appliedSearchTerm: state.searchTerm,
      appliedMode: state.mode,
      appliedIncludeFuture: state.includeFuture,
      appliedSelectedMonth: state.selectedMonth,
      appliedSelectedYear: state.selectedYear,
      appliedTypeFilter: state.typeFilter,
    })),
  limparFiltros: () =>
    set({
      selectedCategories: [],
      dateRange: 30,
      searchTerm: '',
      mode: 'days',
      includeFuture: false,
      selectedMonth: '',
      selectedYear: '',
      typeFilter: 'ALL',
      appliedSelectedCategories: [],
      appliedDateRange: 30,
      appliedSearchTerm: '',
      appliedMode: 'days',
      appliedIncludeFuture: false,
      appliedSelectedMonth: '',
      appliedSelectedYear: '',
      appliedTypeFilter: 'ALL',
    }),
}))
