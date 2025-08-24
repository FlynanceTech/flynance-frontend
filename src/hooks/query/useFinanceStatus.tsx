// src/hooks/query/useFinanceStatus.ts
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

type FinanceStatusParams = {
  userId: string
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

  const daysNorm = Number.isFinite(days) ? Number(days) : undefined
  const monthNorm = month && month.length >= 7 ? month : undefined

  return useQuery<FinanceStatusResponse>({
    queryKey: ['transactions', userId, { days: daysNorm ?? null, month: monthNorm ?? null }],
    enabled: Boolean(userId) && (Boolean(daysNorm) || Boolean(monthNorm)), 

    queryFn: async () => {
      const params: Record<string, string> = { userId }
      if (daysNorm) params.days = String(daysNorm) 
      if (monthNorm) params.month = monthNorm

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
