import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUserCyclePreferences,
  updateUserCyclePreferences,
} from '@/services/userPreferences'
import type { UpdateUserCyclePreferencesInput } from '@/utils/cyclePreferences'

export const userCyclePreferencesQueryKey = ['user-cycle-preferences'] as const

export async function refetchUserCyclePreferences(
  qc: Pick<QueryClient, 'invalidateQueries' | 'refetchQueries'>
) {
  await qc.invalidateQueries({ queryKey: userCyclePreferencesQueryKey })
  await qc.refetchQueries({
    queryKey: userCyclePreferencesQueryKey,
    type: 'active',
    exact: true,
  })
}

export function useUserCyclePreferences() {
  const qc = useQueryClient()

  const preferencesQuery = useQuery({
    queryKey: userCyclePreferencesQueryKey,
    queryFn: getUserCyclePreferences,
    staleTime: 60_000,
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: (payload: UpdateUserCyclePreferencesInput) => updateUserCyclePreferences(payload),
    onSuccess: async () => {
      await refetchUserCyclePreferences(qc)
    },
  })

  return {
    preferencesQuery,
    updatePreferencesMutation,
  }
}
