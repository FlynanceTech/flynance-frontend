// src/hooks/query/useFinanceStatus.ts
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useFinancialScope } from '@/hooks/useFinancialScope'

type FinanceStatusParams = {
  userId?: string
  days?: number
  month?: string
}

type FinanceStatusResponse = {
  period: {
    income: number; expense: number; balance: number;
    incomeChange: number; expenseChange: number; balanceChange: number;
  }
  accumulated: { totalIncome: number; totalExpense: number; totalBalance: number }
}

export function useFinanceStatus({ userId, days, month }: FinanceStatusParams) {
  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const actingContextKey = activeClientId ?? userId ?? 'self'
  const { scope, scopeKey } = useFinancialScope()

  const daysNorm = Number.isFinite(days) ? Number(days) : undefined
  const monthNorm = month && month.length >= 7 ? month : undefined

  return useQuery<FinanceStatusResponse>({
    queryKey: ['financeStatus', actingContextKey, scopeKey, { days: daysNorm ?? null, month: monthNorm ?? null }],
    enabled: (Boolean(userId) || Boolean(activeClientId)) && (Boolean(daysNorm) || Boolean(monthNorm)), 

    queryFn: async () => {
      const params: Record<string, string> = {}
      const contextUserId = activeClientId || userId
      if (contextUserId) params.userId = contextUserId
      if (daysNorm) params.days = String(daysNorm) 
      if (monthNorm) params.month = monthNorm
      if (scope) params.scope = scope

      const res = await api.get<FinanceStatusResponse>('/dashboard/finance-status', {
        params,
        timeout: 15_000,
      })
      return res.data
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
