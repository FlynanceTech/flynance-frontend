'use client'

import { useMemo } from 'react'

import {
  FinancialDataScope,
  isCoupleHouseActive,
  resolveFinancialScopeKey,
} from '@/lib/financialScope'
import { FEATURES } from '@/config/features'
import { useHouseContext } from '@/hooks/query/useHouse'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useFinancialScopeStore } from '@/stores/useFinancialScope'
import { useUserSession } from '@/stores/useUserSession'

export function useFinancialScope() {
  const user = useUserSession((state) => state.user)
  const activeClientId = useAdvisorActing((state) => state.activeClientId ?? state.selectedClientId)
  const currentUserId = user?.userData?.user?.id ?? ''
  const houseQuery = useHouseContext(FEATURES.COUPLE_ACCOUNT && Boolean(currentUserId) && !activeClientId)
  const houseContext = houseQuery.data ?? user?.houseContext ?? null

  const selectedScope = useFinancialScopeStore((state): FinancialDataScope => {
    if (!currentUserId) return 'house'
    return state.scopesByUserId[currentUserId] ?? 'house'
  })
  const setScopeForUser = useFinancialScopeStore((state) => state.setScopeForUser)

  const canSelectScope =
    FEATURES.COUPLE_ACCOUNT && !activeClientId && isCoupleHouseActive(houseContext)
  const currentPersonalScope: FinancialDataScope =
    houseContext?.owner?.userId === currentUserId
      ? 'owner'
      : houseContext?.partner?.userId === currentUserId
      ? 'partner'
      : 'me'
  const normalizedSelectedScope = selectedScope === 'me' ? currentPersonalScope : selectedScope
  const scope = canSelectScope ? normalizedSelectedScope : undefined
  const scopeKey = resolveFinancialScopeKey(canSelectScope, scope)

  const helperText = useMemo(() => {
    if (!canSelectScope) return null
    return scope === 'house' ? 'house' : 'me'
  }, [canSelectScope, scope])

  return {
    canSelectScope,
    currentUserId,
    currentPersonalScope,
    houseContext,
    scope,
    scopeKey,
    helperText,
    setScope: (nextScope: FinancialDataScope) => {
      if (!currentUserId) return
      setScopeForUser(currentUserId, nextScope)
    },
  }
}
