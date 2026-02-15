'use client'

import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  importTransactions,
  importTransactionsConfirm,
  importTransactionsPreview,
  TransactionDTO,
  TransactionFilters,
  updateTransaction,
} from '@/services/transactions'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cardKeys } from './cardkeys'
import { useTransactionFilter } from '@/stores/useFilter'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { getBrowserTimezone, toFutureRangeFromDays } from '@/utils/transactionPeriod'

type Primitive = string | number | boolean
type FilterValue = Primitive | Primitive[] | undefined

type UseTransactionParams = {
  userId?: string
  page?: number
  limit?: number
  filters?: Record<string, FilterValue>
  useGlobalFilters?: boolean
}

type ImportPayload = {
  userId: string
  file: File
}

type ImportConfirmPayload = {
  userId: string
  payload: {
    mode: 'import'
    transactions: any[]
  }
}

export function useTranscation(params: UseTransactionParams) {
  const queryClient = useQueryClient()
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? 'self'

  const mode = useTransactionFilter((s) => s.appliedMode)
  const dateRange = useTransactionFilter((s) => s.appliedDateRange)
  const selectedMonth = useTransactionFilter((s) => s.appliedSelectedMonth)
  const selectedYear = useTransactionFilter((s) => s.appliedSelectedYear)
  const includeFuture = useTransactionFilter((s) => s.appliedIncludeFuture)
  const rangeStart = useTransactionFilter((s) => s.appliedRangeStart)
  const rangeEnd = useTransactionFilter((s) => s.appliedRangeEnd)
  const searchTerm = useTransactionFilter((s) => s.appliedSearchTerm)
  const selectedCategories = useTransactionFilter((s) => s.appliedSelectedCategories)
  const selectedTypeTrasaction = useTransactionFilter((s) => s.appliedTypeFilter)

  const safeDays = Math.max(1, Number(dateRange || 30))
  const includeFutureDays =
    mode === 'days' && includeFuture ? Math.max(0, safeDays - 1) : undefined
  const futureDaysRange =
    mode === 'days' && includeFuture ? toFutureRangeFromDays(safeDays) : null
  const timezone = getBrowserTimezone()

  const globalFilters: TransactionFilters = {
    mode,
    days: mode === 'days' ? safeDays : undefined,
    includeFutureDays,
    month: mode === 'month' ? selectedMonth : undefined,
    year: mode === 'month' ? selectedYear : undefined,
    dateFrom:
      mode === 'range'
        ? rangeStart || undefined
        : futureDaysRange?.start,
    dateTo:
      mode === 'range'
        ? rangeEnd || undefined
        : futureDaysRange?.end,
    timezone,
    search: searchTerm?.trim() ? searchTerm.trim() : undefined,
    categoryIds: selectedCategories?.length ? selectedCategories.map((c) => c.id) : undefined,
    type: selectedTypeTrasaction !== 'ALL' ? selectedTypeTrasaction : undefined,
  }

  const mergedFilters: TransactionFilters =
    params.useGlobalFilters === false
      ? ({ ...(params.filters ?? {}) } as TransactionFilters)
      : ({
          ...(params.filters ?? {}),
          ...globalFilters,
        } as TransactionFilters)

  const transactionsQuery = useQuery({
    queryKey: [
      'transactions',
      params.userId,
      actingContextKey,
      params.page ?? 1,
      params.limit ?? 10,
      mergedFilters,
    ],
    queryFn: () =>
      getTransaction({
        userId: params.userId,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        filters: mergedFilters,
      }),
    enabled: Boolean(params.userId || activeClientId),
    staleTime: 30_000,
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['financeStatus'] })
      queryClient.invalidateQueries({ queryKey: ['controls', { withProgress: true }] })
      queryClient.invalidateQueries({ queryKey: ['fixed-accounts'] })

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
      queryClient.invalidateQueries({ queryKey: ['fixed-accounts'] })
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
      queryClient.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  const importMutation = useMutation({
    mutationFn: ({ userId, file }: ImportPayload) =>
      importTransactions(activeClientId ?? userId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const importPreviewMutation = useMutation({
    mutationFn: ({ userId, file }: ImportPayload) =>
      importTransactionsPreview(activeClientId ?? userId, file),
  })

  const importConfirmMutation = useMutation({
    mutationFn: ({ userId, payload }: ImportConfirmPayload) =>
      importTransactionsConfirm(activeClientId ?? userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['fixed-accounts'] })
    },
  })

  return {
    transactionsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    importMutation,
    importPreviewMutation,
    importConfirmMutation,
  }
}
