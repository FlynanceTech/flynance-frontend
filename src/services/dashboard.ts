import api from "@/lib/axios"

export interface FinancePeriodStatus {
  income: number
  expense: number
  balance: number
  incomeChange: number
  expenseChange: number
  balanceChange: number
}

export interface FinanceAccumulatedStatus {
  totalIncome: number
  totalExpense: number
  totalBalance: number
}

export interface FinanceStatusResponse {
  period: FinancePeriodStatus
  accumulated: FinanceAccumulatedStatus
}


interface GetFinanceStatusParams {
  days?: number
  month?: string // 'YYYY-MM'
}

export async function getFinanceStatus(params?: GetFinanceStatusParams): Promise<FinanceStatusResponse> {
  const query = new URLSearchParams()

  if (params?.days) query.set("days", params.days.toString())
  if (params?.month) query.set("month", params.month)

  const response = await api.get<FinanceStatusResponse>(`/dashboard/finance-status?${query.toString()}`)
  return response.data
}
