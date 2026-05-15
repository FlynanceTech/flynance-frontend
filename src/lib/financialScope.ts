import type { HouseContext } from '@/types/house'

export type FinancialDataScope = 'house' | 'me'
export type FinancialScopeKey = FinancialDataScope | 'default'

export function isCoupleHouseActive(houseContext?: HouseContext | null) {
  return (
    houseContext?.status === 'COUPLE' &&
    Boolean(houseContext.owner?.id) &&
    Boolean(houseContext.partner?.id) &&
    houseContext.partner?.active !== false
  )
}

export function normalizeFinancialScope(
  scope?: FinancialDataScope | null
): FinancialDataScope | undefined {
  if (scope === 'house' || scope === 'me') return scope
  return undefined
}

export function resolveFinancialScopeKey(
  enabled: boolean,
  scope?: FinancialDataScope | null
): FinancialScopeKey {
  if (!enabled) return 'default'
  return normalizeFinancialScope(scope) ?? 'house'
}

export function withFinancialScope(
  params: Record<string, unknown> | undefined,
  scope?: FinancialDataScope | null
): Record<string, unknown> {
  const normalizedScope = normalizeFinancialScope(scope)
  if (!normalizedScope) {
    return params ?? {}
  }

  return {
    ...(params ?? {}),
    scope: normalizedScope,
  }
}

export function appendFinancialScopeToSearchParams(
  searchParams: URLSearchParams,
  scope?: FinancialDataScope | null
) {
  const normalizedScope = normalizeFinancialScope(scope)
  if (!normalizedScope) return
  searchParams.set('scope', normalizedScope)
}
