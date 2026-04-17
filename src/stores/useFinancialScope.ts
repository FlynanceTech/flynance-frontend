import { FinancialDataScope } from '@/lib/financialScope'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type FinancialScopeStore = {
  scopesByUserId: Record<string, FinancialDataScope>
  getScopeForUser: (userId?: string | null) => FinancialDataScope
  setScopeForUser: (userId: string, scope: FinancialDataScope) => void
}

const DEFAULT_SCOPE: FinancialDataScope = 'house'

export const useFinancialScopeStore = create<FinancialScopeStore>()(
  persist(
    (set, get) => ({
      scopesByUserId: {},
      getScopeForUser: (userId) => {
        const safeUserId = String(userId ?? '').trim()
        if (!safeUserId) return DEFAULT_SCOPE
        return get().scopesByUserId[safeUserId] ?? DEFAULT_SCOPE
      },
      setScopeForUser: (userId, scope) => {
        const safeUserId = String(userId ?? '').trim()
        if (!safeUserId) return

        set((state) => ({
          scopesByUserId: {
            ...state.scopesByUserId,
            [safeUserId]: scope,
          },
        }))
      },
    }),
    {
      name: 'flynance:financial-scope',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
