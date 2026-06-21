import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CREDIT_CARD_IMPORT_QUERY_ROOTS,
  refreshQueriesAfterImport,
} from './importQueryRefresh.ts'

test('importação de fatura invalida transações, cartão, futuros e dashboard', async () => {
  const invalidated: string[] = []
  const queryClient = {
    invalidateQueries: async ({ queryKey }: { queryKey: readonly unknown[] }) => {
      invalidated.push(String(queryKey[0]))
    },
  }

  await refreshQueriesAfterImport(queryClient, true)

  assert.ok(invalidated.includes('transactions'))
  assert.ok(invalidated.includes('credit-card-charges'))
  assert.ok(invalidated.includes('future-forecast'))
  assert.ok(invalidated.includes('future-installments'))
  assert.ok(invalidated.includes('financeStatus'))
  assert.ok(invalidated.includes('dashboard'))
  assert.deepEqual(
    CREDIT_CARD_IMPORT_QUERY_ROOTS.every((root) => invalidated.includes(root)),
    true
  )
})

test('confirmação aguarda todos os refetches antes de concluir', async () => {
  let completed = 0
  const queryClient = {
    invalidateQueries: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      completed += 1
    },
  }

  await refreshQueriesAfterImport(queryClient, true)
  assert.equal(completed, 11)
})
