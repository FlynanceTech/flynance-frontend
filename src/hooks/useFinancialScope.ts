'use client'

import { useMemo } from 'react'

import {
  FinancialDataScope,
  isCoupleHouseActive,
  resolveFinancialScopeKey,
} from '@/lib/financialScope'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { useFinancialScopeStore } from '@/stores/useFinancialScope'
import { useUserSession } from '@/stores/useUserSession'

export function useFinancialScope() {
  const user = useUserSession((state) => state.user)
  const activeClientId = useAdvisorActing((state) => state.activeClientId ?? state.selectedClientId)
  const currentUserId = user?.userData?.user?.id ?? ''
  const houseContext = user?.houseContext ?? null

  const getScopeForUser = useFinancialScopeStore((state) => state.getScopeForUser)
  const setScopeForUser = useFinancialScopeStore((state) => state.setScopeForUser)
  const selectedScope = getScopeForUser(currentUserId)

  const canSelectScope = !activeClientId && isCoupleHouseActive(houseContext)
  const scope = canSelectScope ? selectedScope : undefined
  const scopeKey = resolveFinancialScopeKey(canSelectScope, scope)

  const helperText = useMemo(() => {
    if (!canSelectScope) return null
    return scope === 'me' ? 'me' : 'house'
  }, [canSelectScope, scope])

  return {
    canSelectScope,
    currentUserId,
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
