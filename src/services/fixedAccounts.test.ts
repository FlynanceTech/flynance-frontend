import test from 'node:test'
import assert from 'node:assert/strict'
import api from '@/lib/axios'
import { updateFixedAccount } from './fixedAccounts'

test('updateFixedAccount: chama somente PUT /fixed-accounts/:id com payload ISO', async () => {
  const putCalls: Array<{ url: string; data: unknown }> = []
  const originalPut = api.put.bind(api)

  ;(api.put as unknown as (url: string, data: unknown) => Promise<{ data: unknown }>) = async (
    url,
    data
  ) => {
    putCalls.push({ url, data })
    return { data: { id: 'fa_1' } }
  }

  try {
    await updateFixedAccount('fa_1', {
      name: 'Luz (Light)',
      amount: 320.23,
      categoryId: 'cat-1',
      frequency: 'monthly',
      startDate: '2026-02-10',
      dueDay: 10,
      status: 'active',
    })
  } finally {
    ;(api.put as unknown as typeof api.put) = originalPut
  }

  assert.equal(putCalls.length, 1)
  assert.equal(putCalls[0].url, '/fixed-accounts/fa_1')

  const payload = putCalls[0].data as { startDate?: string; dueDay?: number }
  assert.equal(payload.startDate, '2026-02-10')
  assert.equal(payload.dueDay, 10)
  assert.match(String(payload.startDate ?? ''), /^\d{4}-\d{2}-\d{2}$/)

  assert.equal(putCalls.some((call) => call.url.includes('/mark-paid')), false)
  assert.equal(putCalls.some((call) => call.url.includes('/unmark-paid')), false)
})
