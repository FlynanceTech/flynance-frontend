import test from 'node:test'
import assert from 'node:assert/strict'

import { groupCreditCardInvoices, type FutureItem } from './futureService'

const baseItem = {
  id: 'item-1',
  sourceType: 'credit_card_statement_installment',
  description: 'Uber',
  type: 'EXPENSE',
  paymentType: 'CREDIT_CARD',
  amount: 42,
  dueDate: '2026-05-15T00:00:00.000Z',
  category: { id: 'cat-1', name: 'Transporte' },
  card: { id: 'card-1', name: 'Nubank', last4: null },
  status: 'open',
  installmentNumber: 1,
  installmentCount: 1,
  statement: {
    id: 'statement-1',
    cycleKey: '2026-05',
    dueAt: '2026-05-15T00:00:00.000Z',
    closingAt: '2026-05-08T00:00:00.000Z',
    status: 'open',
  },
} satisfies FutureItem

test('groupCreditCardInvoices keeps open card statement installments', () => {
  const groups = groupCreditCardInvoices([baseItem])

  assert.equal(groups.length, 1)
  assert.equal(groups[0].totalAmount, 42)
})

test('groupCreditCardInvoices removes paid card statement installments from future pending groups', () => {
  const groups = groupCreditCardInvoices([
    { ...baseItem, id: 'paid-item', status: 'PAID' },
    { ...baseItem, id: 'paid-statement-item', statement: { ...baseItem.statement!, status: 'paid' } },
  ])

  assert.equal(groups.length, 0)
})
