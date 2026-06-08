import test from 'node:test'
import assert from 'node:assert/strict'

import type { Transaction } from '@/types/Transaction'
import { isEffectiveCashflowTransaction } from './cashflowTransactions'
import {
  buildCreditCardImportItemFingerprint,
  buildCreditCardStatementImportKey,
  isCreditCardStatementPaymentAdjustmentDescription,
  normalizeCreditCardStatementImportTransactions,
  splitCreditCardStatementImportTransactions,
} from './creditCardImportGuards'

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    userId: 'user-1',
    value: 42,
    description: 'Uber',
    categoryId: 'cat-1',
    date: '2026-05-10T00:00:00.000Z',
    type: 'EXPENSE',
    origin: 'IMPORT',
    category: {
      id: 'cat-1',
      name: 'Transporte',
      color: '#3B82F6',
      icon: 'Car',
      type: 'EXPENSE',
    },
    paymentType: 'CREDIT_CARD',
    ...overrides,
  }
}

test('ignores Nubank payment received lines during credit card statement import', () => {
  const paymentAdjustment = makeTransaction({
    id: 'payment-adjustment-1',
    description: 'Pagamentos Recebidos',
    value: 3258.03,
  })
  const purchase = makeTransaction({
    id: 'purchase-1',
    description: 'Amazon',
    value: 139.9,
  })

  const result = splitCreditCardStatementImportTransactions([paymentAdjustment, purchase])

  assert.equal(isCreditCardStatementPaymentAdjustmentDescription('Pagamentos Recebidos'), true)
  assert.deepEqual(result.importable.map((transaction) => transaction.id), ['purchase-1'])
  assert.equal(result.ignored.length, 1)
  assert.equal(result.ignored[0].reason, 'statement_payment_adjustment')
})

test('normalizes imported card purchases away from cash payment types', () => {
  const purchase = makeTransaction({
    id: 'purchase-1',
    description: 'Mercado',
    paymentType: 'PIX',
    cardId: null,
  })

  const [normalized] = normalizeCreditCardStatementImportTransactions([purchase], 'card-1')

  assert.equal(normalized.paymentType, 'CREDIT_CARD')
  assert.equal(normalized.cardId, 'card-1')
  assert.equal(normalized.metadata?.importKind, 'CREDIT_CARD_STATEMENT')
  assert.equal(normalized.metadata?.createEffectiveTransaction, false)
  assert.equal(isEffectiveCashflowTransaction(normalized), false)
})

test('builds stable fingerprints and statement import keys for reimport idempotency', () => {
  const uber = makeTransaction({
    id: 'purchase-1',
    description: 'Uber',
    value: 25.9,
    date: '2026-05-01T03:00:00.000Z',
  })
  const netflix = makeTransaction({
    id: 'purchase-2',
    description: 'Netflix',
    value: 39.9,
    date: '2026-05-02T03:00:00.000Z',
  })
  const sameUber = makeTransaction({
    id: 'purchase-1-copy',
    description: 'UBER',
    value: 25.9,
    date: '2026-05-01T12:00:00.000Z',
  })

  assert.equal(
    buildCreditCardImportItemFingerprint(uber),
    buildCreditCardImportItemFingerprint(sameUber)
  )
  assert.equal(
    buildCreditCardStatementImportKey({
      cardId: 'card-1',
      transactions: [uber, netflix],
    }),
    buildCreditCardStatementImportKey({
      cardId: 'card-1',
      transactions: [netflix, uber],
    })
  )
})
