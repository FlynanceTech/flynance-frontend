import test from 'node:test'
import assert from 'node:assert/strict'
import { refetchFixedAccountDetail, refetchFixedAccountsMonth } from './useFixedAccounts'

test('refetchFixedAccountsMonth: executa refetch do mes atual apos mark-paid', async () => {
  const calls: Array<{ method: 'invalidate' | 'refetch'; payload: unknown }> = []
  const queryClient = {
    invalidateQueries: async (payload: unknown) => {
      calls.push({ method: 'invalidate', payload })
    },
    refetchQueries: async (payload: unknown) => {
      calls.push({ method: 'refetch', payload })
    },
  }

  const params = { periodStart: '2026-02-01', periodEnd: '2026-02-28' }
  await refetchFixedAccountsMonth(queryClient as any, 'self', 'house', params)

  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], {
    method: 'invalidate',
    payload: { queryKey: ['fixed-accounts', 'self', 'house', params] },
  })
  assert.deepEqual(calls[1], {
    method: 'refetch',
    payload: { queryKey: ['fixed-accounts', 'self', 'house', params], type: 'active', exact: true },
  })
})

test('refetchFixedAccountsMonth: executa refetch do mes atual apos unmark-paid', async () => {
  const calls: Array<{ method: 'invalidate' | 'refetch'; payload: unknown }> = []
  const queryClient = {
    invalidateQueries: async (payload: unknown) => {
      calls.push({ method: 'invalidate', payload })
    },
    refetchQueries: async (payload: unknown) => {
      calls.push({ method: 'refetch', payload })
    },
  }

  const params = { periodStart: '2026-02-01', periodEnd: '2026-02-28' }
  await refetchFixedAccountsMonth(queryClient as any, 'self', 'house', params)

  assert.equal(calls.length, 2)
  assert.equal(calls[0].method, 'invalidate')
  assert.equal(calls[1].method, 'refetch')
})

test('refetchFixedAccountDetail: recarrega detalhe e invalida historico da conta', async () => {
  const calls: Array<{ method: 'invalidate' | 'refetch'; payload: unknown }> = []
  const queryClient = {
    invalidateQueries: async (payload: unknown) => {
      calls.push({ method: 'invalidate', payload })
    },
    refetchQueries: async (payload: unknown) => {
      calls.push({ method: 'refetch', payload })
    },
  }

  await refetchFixedAccountDetail(queryClient as any, 'self', 'house', 'fa_1')

  assert.deepEqual(calls[0], {
    method: 'invalidate',
    payload: { queryKey: ['fixed-account', 'self', 'house', 'fa_1'] },
  })
  assert.deepEqual(calls[1], {
    method: 'refetch',
    payload: { queryKey: ['fixed-account', 'self', 'house', 'fa_1'], type: 'active', exact: true },
  })
  assert.deepEqual(calls[2], {
    method: 'invalidate',
    payload: { queryKey: ['fixed-accounts', 'self', 'house', 'fa_1', 'payments'] },
  })
})
