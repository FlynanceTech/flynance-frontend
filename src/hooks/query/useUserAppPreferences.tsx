import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { UserPreferences, UserPreferencesPatch } from '@/types/userPreferences'
import { getUserAppPreferences, updateUserAppPreferences } from '@/services/userAppPreferences'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'

export const userAppPreferencesQueryKey = ['user-app-preferences'] as const

type MutationContext = {
  previousQuery: UserPreferences | undefined
  previousStore: UserPreferences | null
}

export function useUserAppPreferences() {
  const queryClient = useQueryClient()
  const setPreferences = useUserPreferencesStore((s) => s.setPreferences)
  const mergePreferences = useUserPreferencesStore((s) => s.mergePreferences)
  const storePreferences = useUserPreferencesStore((s) => s.preferences)

  const preferencesQuery = useQuery({
    queryKey: userAppPreferencesQueryKey,
    queryFn: getUserAppPreferences,
    staleTime: 60_000,
    initialData: storePreferences ?? undefined,
    refetchOnMount: 'always',
  })

  useEffect(() => {
    if (preferencesQuery.data) {
      setPreferences(preferencesQuery.data)
    }
  }, [preferencesQuery.data, setPreferences])

  const updatePreferencesMutation = useMutation({
    mutationFn: (payload: UserPreferencesPatch) => updateUserAppPreferences(payload),
    onMutate: async (patch): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: userAppPreferencesQueryKey })

      const previousQuery = queryClient.getQueryData<UserPreferences>(userAppPreferencesQueryKey)
      const previousStore = useUserPreferencesStore.getState().preferences

      if (previousStore) {
        const optimistic = {
          ...previousStore,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
        setPreferences(optimistic)
        queryClient.setQueryData(userAppPreferencesQueryKey, optimistic)
      } else if (previousQuery) {
        const optimistic = {
          ...previousQuery,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
        setPreferences(optimistic)
        queryClient.setQueryData(userAppPreferencesQueryKey, optimistic)
      }

      return { previousQuery, previousStore }
    },
    onError: (_error, _patch, context) => {
      if (!context) return
      setPreferences(context.previousStore)
      queryClient.setQueryData(userAppPreferencesQueryKey, context.previousQuery)
    },
    onSuccess: (nextPreferences) => {
      setPreferences(nextPreferences)
      queryClient.setQueryData(userAppPreferencesQueryKey, nextPreferences)
    },
  })

  return {
    preferencesQuery,
    updatePreferencesMutation,
    mergePreferences,
  }
}
