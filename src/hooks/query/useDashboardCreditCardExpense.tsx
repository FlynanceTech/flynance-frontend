'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardCreditCardExpense,
  DashboardCreditCardExpenseResponse,
} from '@/services/dashboard'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useFinancialScope } from '@/hooks/useFinancialScope'

interface UseDashboardCreditCardExpenseParams {
  userId?: string
  month?: string
  from?: string
  to?: string
  filterBy?: 'purchase' | 'statement'
  enabled?: boolean
}

export function useDashboardCreditCardExpense(params: UseDashboardCreditCardExpenseParams) {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const { scope, scopeKey } = useFinancialScope()

  return useQuery<DashboardCreditCardExpenseResponse>({
    queryKey: [
      'dashboard-cc-expense',
      params.month,
      params.from,
      params.to,
      params.filterBy,
      activeClientId ?? 'self',
      scopeKey,
    ],
    queryFn: () =>
      getDashboardCreditCardExpense({
        month: params.month,
        from: params.from,
        to: params.to,
        filterBy: params.filterBy,
        scope,
      }),
    enabled: (params.enabled ?? true) && Boolean(params.userId),
    staleTime: 30_000,
  })
}
