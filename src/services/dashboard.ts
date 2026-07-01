import api from "@/lib/axios"
import { FinancialDataScope, appendFinancialScopeToSearchParams, withFinancialScope } from "@/lib/financialScope"

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
  scope?: FinancialDataScope
}
export type PaymentType =
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'PIX'
  | 'BOLETO'
  | 'TED'
  | 'DOC'
  | 'MONEY'
  | 'CASH'
  | 'OTHER'

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
  scope?: FinancialDataScope
}) {
  const { data } = await api.get<PaymentTypeSummary>('/dashboard/payment-summary', {
    params: withFinancialScope(params ?? { mode: 'days', days: 30 }, params?.scope),
  })
  return data
}
export interface CreditCardInstallmentItem {
  id: string
  chargeId: string
  description: string
  amount: number
  installmentNumber: number
  installmentCount: number
  statementMonthKey: string
  statementDueAt: string
  purchaseDate: string
  categoryId: string | null
  category: { id: string; name: string; color: string; icon: string } | null
  cardId: string | null
  card: { id: string; name: string; last4: string | null } | null
  userInfo: { id: string; name: string | null; email: string | null } | null
}

export interface DashboardCreditCardExpenseResponse {
  totalExpense: number
  items: CreditCardInstallmentItem[]
}

export async function getDashboardCreditCardExpense(params: {
  month?: string
  from?: string
  to?: string
  filterBy?: 'purchase' | 'statement'
  scope?: FinancialDataScope
}): Promise<DashboardCreditCardExpenseResponse> {
  const query = new URLSearchParams()
  if (params.month) query.set('month', params.month)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.filterBy) query.set('filterBy', params.filterBy)
  appendFinancialScopeToSearchParams(query, params.scope)

  const response = await api.get<DashboardCreditCardExpenseResponse>(
    `/dashboard/credit-card-expense?${query.toString()}`
  )
  return response.data
}

export async function getFinanceStatus(params?: GetFinanceStatusParams): Promise<FinanceStatusResponse> {
  const query = new URLSearchParams()

  if (params?.days) query.set("days", params.days.toString())
  if (params?.month) query.set("month", params.month)
  appendFinancialScopeToSearchParams(query, params?.scope)

  const response = await api.get<FinanceStatusResponse>(`/dashboard/finance-status?${query.toString()}`)
  return response.data
}
