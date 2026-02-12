export type Insight = {
  severity: 'low' | 'medium' | 'high' | string
  title: string
  message: string
  recommendation?: string
}

export type AnnualReport = {
  score: number
  periodStart?: string
  periodEnd?: string
  summary: {
    totalIncome: number
    totalExpenses: number
    balance: number
    savingRate: number
    debtRatio: number
    creditCardRatio: number
    avgMonthlyIncome?: number
    avgMonthlyExpenses?: number
    expenseVolatility: 'low' | 'medium' | 'high' | string
    goalsAchievedRate: number
  }
  breakdowns: {
    monthly: { month: string; income: number; expenses: number; balance: number }[]
    categories: { name: string; total: number }[]
    recurring: { name: string; total: number }[]
    recurringExpenseRatio: number
  }
  insights: Insight[]
  aiInsights: Insight[] | null
}

export type AnnualCompare = {
  balanceDiff: number
  incomeDiff: number
  expenseDiff: number
  savingRateDiff: number
}
