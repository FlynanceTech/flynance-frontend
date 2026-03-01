import test from 'node:test'
import assert from 'node:assert/strict'
import type { BillingSubscriptionSummary } from './billing'
import { resolveSubscriptionNextDueDate } from './billing'

function createSummary(
  overrides: Partial<BillingSubscriptionSummary>
): BillingSubscriptionSummary {
  return {
    ok: true,
    hasSubscription: true,
    source: 'db_only',
    db: null,
    stripe: null,
    paymentMethod: null,
    ...overrides,
  }
}

test('resolveSubscriptionNextDueDate: source=stripe usa stripe.nextDueDate', () => {
  const summary = createSummary({
    source: 'stripe',
    stripe: {
      id: 'sub_1',
      status: 'active',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodStart: '2026-02-01T00:00:00.000Z',
      currentPeriodEnd: '2026-03-01T00:00:00.000Z',
      nextDueDate: '2026-02-25T00:00:00.000Z',
      pauseCollection: null,
    },
  })

  assert.equal(resolveSubscriptionNextDueDate(summary), '2026-02-25T00:00:00.000Z')
})

test('resolveSubscriptionNextDueDate: source=stripe faz fallback para currentPeriodEnd', () => {
  const summary = createSummary({
    source: 'stripe',
    stripe: {
      id: 'sub_2',
      status: 'active',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodStart: '2026-02-01T00:00:00.000Z',
      currentPeriodEnd: '2026-03-01T00:00:00.000Z',
      nextDueDate: null,
      pauseCollection: null,
    },
  })

  assert.equal(resolveSubscriptionNextDueDate(summary), '2026-03-01T00:00:00.000Z')
})

test('resolveSubscriptionNextDueDate: source=db_only usa db.nextDueDate', () => {
  const summary = createSummary({
    source: 'db_only',
    db: {
      signatureId: 'sig_1',
      subscriptionId: null,
      status: 'ACTIVE',
      active: true,
      cancelAtPeriodEnd: false,
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: null,
      nextDueDate: '2026-02-25T00:00:00.000Z',
      value: 19.9,
      plan: null,
    },
  })

  assert.equal(resolveSubscriptionNextDueDate(summary), '2026-02-25T00:00:00.000Z')
})
