import test from 'node:test'
import assert from 'node:assert/strict'

import {
  filterEffectiveCashflowTransactions,
  getCreditCardStatementPaymentDetails,
  isCreditCardStatementPaymentTransaction,
  isEffectiveCashflowTransaction,
} from './cashflowTransactions'
import type { Transaction } from '@/types/Transaction'

test('cashflow helpers exclude individual credit card purchases', () => {
  assert.equal(isEffectiveCashflowTransaction({ paymentType: 'CREDIT_CARD' } as Transaction), false)
  assert.equal(isEffectiveCashflowTransaction({ paymentType: 'PIX' } as Transaction), true)

  const filtered = filterEffectiveCashflowTransactions([
    { id: 'cash-1', paymentType: 'PIX' },
    { id: 'credit-1', paymentType: 'CREDIT_CARD' },
    { id: 'cash-2', paymentType: 'DEBIT_CARD' },
  ])

  assert.deepEqual(filtered.map((item) => item.id), ['cash-1', 'cash-2'])
})

test('normalizes credit card statement payment details from flexible backend shapes', () => {
  const transaction = {
    id: 'statement-payment-1',
    paymentType: 'PIX',
    creditCardPayment: {
      charges: [
        {
          id: 'installment-1',
          description: 'Uber',
          category: { name: 'Transporte' },
          installmentNumber: 1,
          installmentCount: 1,
          amount: 25.9,
          purchaseDate: '2026-05-01T00:00:00.000Z',
        },
      ],
    },
  } as unknown as Transaction

  assert.equal(isCreditCardStatementPaymentTransaction(transaction), true)
  assert.deepEqual(getCreditCardStatementPaymentDetails(transaction), [
    {
      id: 'installment-1',
      description: 'Uber',
      categoryName: 'Transporte',
      installmentNumber: 1,
      installmentCount: 1,
      amount: 25.9,
      date: '2026-05-01T00:00:00.000Z',
    },
  ])
})
