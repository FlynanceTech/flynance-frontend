import assert from 'node:assert/strict'
import test from 'node:test'
import {
  refetchUserCyclePreferences,
  userCyclePreferencesQueryKey,
} from './useUserCyclePreferences'

test('refetchUserCyclePreferences: invalida e refaz a query apos salvar preferencias', async () => {
  const calls: Array<{ method: 'invalidate' | 'refetch'; payload: unknown }> = []
  const queryClient = {
    invalidateQueries: async (payload: unknown) => {
      calls.push({ method: 'invalidate', payload })
    },
    refetchQueries: async (payload: unknown) => {
      calls.push({ method: 'refetch', payload })
    },
  }

  await refetchUserCyclePreferences(queryClient as any)

  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], {
    method: 'invalidate',
    payload: { queryKey: userCyclePreferencesQueryKey },
  })
  assert.deepEqual(calls[1], {
    method: 'refetch',
    payload: {
      queryKey: userCyclePreferencesQueryKey,
      type: 'active',
      exact: true,
    },
  })
})
