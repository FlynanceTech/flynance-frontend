import { CategoryResponse } from '@/services/category'
import { create } from 'zustand'

type FilterMode = 'days' | 'month' | 'range'
type TxTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE'

const DAY_MS = 24 * 60 * 60 * 1000

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultDateRange() {
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end.getTime() - 29 * DAY_MS)
  return {
    start: toISODate(start),
    end: toISODate(end),
  }
}

const initialRange = getDefaultDateRange()

interface FiltroTransacoesStore {
  selectedCategories: CategoryResponse[]
  dateRange: number
  searchTerm: string
  mode: FilterMode
  includeFuture: boolean
  selectedMonth: string
  selectedYear: string
  rangeStart: string
  rangeEnd: string
  typeFilter: TxTypeFilter
  appliedSelectedCategories: CategoryResponse[]
  appliedDateRange: number
  appliedSearchTerm: string
  appliedMode: FilterMode
  appliedIncludeFuture: boolean
  appliedSelectedMonth: string
  appliedSelectedYear: string
  appliedRangeStart: string
  appliedRangeEnd: string
  appliedTypeFilter: TxTypeFilter
  setIncludeFuture: (value: boolean) => void
  setTypeFilter: (v: TxTypeFilter) => void
  setSelectedCategories: (cats: CategoryResponse[]) => void
  setDateRange: (value: number) => void
  setSearchTerm: (termo: string) => void
  setMode: (mode: FilterMode) => void
  setSelectedMonth: (month: string) => void
  setSelectedYear: (year: string) => void
  setRangeStart: (start: string) => void
  setRangeEnd: (end: string) => void
  setAppliedTypeFilter: (v: TxTypeFilter) => void
  setAppliedSelectedCategories: (cats: CategoryResponse[]) => void
  setAppliedDateRange: (value: number) => void
  setAppliedSearchTerm: (termo: string) => void
  setAppliedMode: (mode: FilterMode) => void
  setAppliedIncludeFuture: (value: boolean) => void
  setAppliedSelectedMonth: (month: string) => void
  setAppliedSelectedYear: (year: string) => void
  setAppliedRangeStart: (start: string) => void
  setAppliedRangeEnd: (end: string) => void
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
  rangeStart: initialRange.start,
  rangeEnd: initialRange.end,
  typeFilter: 'ALL',
  appliedSelectedCategories: [],
  appliedDateRange: 30,
  appliedSearchTerm: '',
  appliedMode: 'days',
  appliedIncludeFuture: false,
  appliedSelectedMonth: '',
  appliedSelectedYear: '',
  appliedRangeStart: initialRange.start,
  appliedRangeEnd: initialRange.end,
  appliedTypeFilter: 'ALL',
  setIncludeFuture: (value) => set({ includeFuture: value }),
  setTypeFilter: (v) => set({ typeFilter: v }),
  setSelectedCategories: (categorias) => set({ selectedCategories: categorias }),
  setDateRange: (periodo) => set({ dateRange: periodo }),
  setSearchTerm: (termo) => set({ searchTerm: termo }),
  setMode: (mode) => set({ mode }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setRangeStart: (start) => set({ rangeStart: start }),
  setRangeEnd: (end) => set({ rangeEnd: end }),
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
  setAppliedRangeStart: (start) => set({ appliedRangeStart: start, rangeStart: start }),
  setAppliedRangeEnd: (end) => set({ appliedRangeEnd: end, rangeEnd: end }),
  applyFilters: () =>
    set((state) => ({
      appliedSelectedCategories: state.selectedCategories,
      appliedDateRange: state.dateRange,
      appliedSearchTerm: state.searchTerm,
      appliedMode: state.mode,
      appliedIncludeFuture: state.includeFuture,
      appliedSelectedMonth: state.selectedMonth,
      appliedSelectedYear: state.selectedYear,
      appliedRangeStart: state.rangeStart,
      appliedRangeEnd: state.rangeEnd,
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
      rangeStart: initialRange.start,
      rangeEnd: initialRange.end,
      typeFilter: 'ALL',
      appliedSelectedCategories: [],
      appliedDateRange: 30,
      appliedSearchTerm: '',
      appliedMode: 'days',
      appliedIncludeFuture: false,
      appliedSelectedMonth: '',
      appliedSelectedYear: '',
      appliedRangeStart: initialRange.start,
      appliedRangeEnd: initialRange.end,
      appliedTypeFilter: 'ALL',
    }),
}))
