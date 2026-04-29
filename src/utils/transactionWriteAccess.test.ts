import test from 'node:test'
import assert from 'node:assert/strict'

import { isAdvisorReadOnlyTransactionAccess } from './transactionWriteAccess'

test('returns true for advisor active client with READ_ONLY', () => {
  assert.equal(isAdvisorReadOnlyTransactionAccess('client-1', 'READ_ONLY'), true)
})

test('returns false for advisor active client with READ_WRITE', () => {
  assert.equal(isAdvisorReadOnlyTransactionAccess('client-1', 'READ_WRITE'), false)
})

test('returns false when there is no active client context', () => {
  assert.equal(isAdvisorReadOnlyTransactionAccess('', 'READ_ONLY'), false)
  assert.equal(isAdvisorReadOnlyTransactionAccess(null, 'READ_ONLY'), false)
})
