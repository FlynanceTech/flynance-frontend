'use client'

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  importTransactionsPreview,
  importTransactions,
  TransactionDTO,
  TransactionFilters,
  updateTransaction,
} from '@/services/transactions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardKeys } from './cardkeys'
import { useTransactionFilter } from '@/stores/useFilter'

type Primitive = string | number | boolean
type FilterValue = Primitive | Primitive[] | undefined

type UseTransactionParams = {
  userId?: string
  page?: number
  limit?: number
  filters?: Record<string, FilterValue>
}

type ImportPayload = {
  userId: string
  file: File
}

export function useTranscation(params: UseTransactionParams) {
  const queryClient = useQueryClient()

  // ✅ filtro global (zustand)
  const mode = useTransactionFilter((s) => s.appliedMode)
  const dateRange = useTransactionFilter((s) => s.appliedDateRange)
  const selectedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const selectedYear = useTransactionFilter((s) => s.appliedSelectedYear)
  const searchTerm = useTransactionFilter((s) => s.appliedSearchTerm)
  const selectedCategories = useTransactionFilter((s) => s.appliedSelectedCategories)
  const selectedTypeTrasaction = useTransactionFilter((s) => s.appliedTypeFilter)

  // ✅ transforma store -> filtros da API
  const globalFilters: TransactionFilters = {
    mode: mode === 'month' ? 'month' : 'days',
    days: mode === 'days' ? Number(dateRange || 30) : undefined,
    month: mode === 'month' ? selectedMonth : undefined,
    year: mode === 'month' ? selectedYear : undefined,
    search: searchTerm?.trim() ? searchTerm.trim() : undefined,
    categoryIds: selectedCategories?.length ? selectedCategories.map((c) => c.id) : undefined,
    type: selectedTypeTrasaction !== 'ALL' ? selectedTypeTrasaction : undefined,
  }

  // ✅ merge: filtros do caller + global (global vence)
  const mergedFilters: TransactionFilters = {
    ...(params.filters ?? {}),
    ...globalFilters,
  }
  const transactionsQuery = useQuery({
    // ✅ importantíssimo: o cache precisa depender do filtro global
    queryKey: ['transactions', params.userId, params.page ?? 1, params.limit ?? 10, mergedFilters],
    queryFn: () =>
      getTransaction({
        userId: params.userId as string,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        filters: mergedFilters,
      }),
    enabled: !!params.userId,
    staleTime: 30_000,
    retry: 1,
  })


  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['financeStatus'] })
      queryClient.invalidateQueries({ queryKey: ['controls', { withProgress: true }] })

      if (variables?.paymentType === 'CREDIT_CARD' && variables?.cardId) {
        queryClient.invalidateQueries({
          queryKey: ['creditCard-summary', { cardId: variables.cardId }],
        })
        queryClient.invalidateQueries({ queryKey: cardKeys.card(variables.cardId) })
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionDTO }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'cards' &&
          q.queryKey[1] === 'summary',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const importMutation = useMutation({
    mutationFn: ({ userId, file }: ImportPayload) => importTransactions(userId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const importPreviewMutation = useMutation({
    mutationFn: ({ userId, file }: ImportPayload) => importTransactionsPreview(userId, file),
  })

  return {
    transactionsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    importMutation,
    importPreviewMutation,
  }
}
