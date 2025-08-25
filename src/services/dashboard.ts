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
export type PaymentType = 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'MONEY'

export type PaymentBucket = {
  type: PaymentType
  total: number
  count: number
  avg: number
  sharePct: number
  deltaPct: number
}

export type PaymentTypeSummary = {
  range: { start: string; end: string }
  total: number
  buckets: PaymentBucket[]
}

export async function getPaymentTypeSummary(params?: {
  mode?: 'days' | 'month'
  days?: number
  year?: number
  month?: number
}) {
  const { data } = await api.get<PaymentTypeSummary>('/dashboard/payment-summary', {
    params: params ?? { mode: 'days', days: 30 },
  })
  return data
}
export async function getFinanceStatus(params?: GetFinanceStatusParams): Promise<FinanceStatusResponse> {
  const query = new URLSearchParams()

  if (params?.days) query.set("days", params.days.toString())
  if (params?.month) query.set("month", params.month)

  const response = await api.get<FinanceStatusResponse>(`/dashboard/finance-status?${query.toString()}`)
  return response.data
}
