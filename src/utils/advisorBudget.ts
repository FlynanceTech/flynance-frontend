export type BudgetInputMode = 'nominal' | 'percent'

export type BudgetLimitValue = {
  nominalLimit?: number | null
  percentLimit?: number | null
}

export type BudgetLimitPayload = {
  nominalLimit: number | null
  percentLimit: number | null
}

const EPSILON = 0.000001

export function parseBudgetValue(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function percentageToAmount(percent: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0 || percent <= 0) return 0
  return (monthlyIncome * percent) / 100
}

export function amountToPercentage(amount: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0 || amount <= 0) return 0
  return (amount / monthlyIncome) * 100
}

export function resolveBudgetMode(limit?: BudgetLimitValue | null): BudgetInputMode {
  return limit?.percentLimit != null ? 'percent' : 'nominal'
}

export function resolveBudgetAmount(
  limit: BudgetLimitValue | null | undefined,
  monthlyIncome: number
): number {
  if (!limit) return 0
  if (limit.percentLimit != null) {
    return percentageToAmount(parseBudgetValue(limit.percentLimit), monthlyIncome)
  }
  return parseBudgetValue(limit.nominalLimit)
}

export function buildBudgetLimitPayload(
  mode: BudgetInputMode,
  rawValue: string | number | null | undefined
): BudgetLimitPayload {
  const value = parseBudgetValue(rawValue)
  if (value === 0) return { nominalLimit: null, percentLimit: null }
  return mode === 'percent'
    ? { nominalLimit: null, percentLimit: value }
    : { nominalLimit: value, percentLimit: null }
}

export function calculateDistribution(
  groupValue: string | number | null | undefined,
  categoryValues: Array<string | number | null | undefined>
) {
  const total = parseBudgetValue(groupValue)
  const distributed = categoryValues.reduce<number>(
    (sum, value) => sum + parseBudgetValue(value),
    0
  )
  const remaining = total - distributed
  return {
    total,
    distributed,
    remaining,
    exceedsGroup: remaining < -EPSILON,
  }
}

export function maxCategoryValue(
  groupValue: string | number | null | undefined,
  otherCategoryValues: Array<string | number | null | undefined>
): number {
  const usedByOthers = otherCategoryValues.reduce<number>(
    (sum, value) => sum + parseBudgetValue(value),
    0
  )
  return Math.max(0, parseBudgetValue(groupValue) - usedByOthers)
}

export function calculateBudgetSummary(groupAmounts: number[], monthlyIncome: number) {
  const totalBudgeted = groupAmounts.reduce(
    (sum, value) => sum + Math.max(0, Number.isFinite(value) ? value : 0),
    0
  )
  const percentage = monthlyIncome > 0 ? (totalBudgeted / monthlyIncome) * 100 : null
  return {
    totalBudgeted,
    percentage,
    exceedsIncome: percentage != null && percentage > 100 + EPSILON,
    shouldWarn: percentage != null && percentage >= 80 - EPSILON,
  }
}

export function roundBudgetValue(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
