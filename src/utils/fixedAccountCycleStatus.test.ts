import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isPaidCurrentCycle,
  isPaidInCompetence,
  matchesCurrentCycleFilter,
  shouldDisplayOverdueTag,
} from './fixedAccountCycleStatus'

test('filtro por statusCurrentCycle no mes selecionado', () => {
  const accounts = [
    { id: 'a', statusCurrentCycle: 'PAID' },
    { id: 'b', statusCurrentCycle: 'PENDING' },
    { id: 'c', statusCurrentCycle: 'OVERDUE' },
  ]

  const paid = accounts.filter((account) => matchesCurrentCycleFilter(account.statusCurrentCycle, 'paid'))
  const pending = accounts.filter((account) =>
    matchesCurrentCycleFilter(account.statusCurrentCycle, 'pending')
  )

  assert.deepEqual(
    paid.map((account) => account.id),
    ['a']
  )
  assert.deepEqual(
    pending.map((account) => account.id),
    ['b', 'c']
  )
})

test('paymentCurrentCycle null com payments preenchido nao muda regra de status', () => {
  const account = {
    statusCurrentCycle: 'PENDING',
    paymentCurrentCycle: null,
    payments: [{ id: 'p1', amount: 120 }],
  }

  assert.equal(isPaidCurrentCycle(account.statusCurrentCycle), false)
  assert.equal(matchesCurrentCycleFilter(account.statusCurrentCycle, 'paid'), false)
  assert.equal(matchesCurrentCycleFilter(account.statusCurrentCycle, 'pending'), true)
})

test('shouldDisplayOverdueTag: OVERDUE sem vencimento passado nao exibe atraso', () => {
  assert.equal(
    shouldDisplayOverdueTag({
      status: 'OVERDUE',
      dueDate: '2026-02-25',
      todayISODate: '2026-02-25',
      timeZone: 'America/Sao_Paulo',
    }),
    false
  )

  assert.equal(
    shouldDisplayOverdueTag({
      status: 'OVERDUE',
      dueDate: '2026-02-26',
      todayISODate: '2026-02-25',
      timeZone: 'America/Sao_Paulo',
    }),
    false
  )
})

test('shouldDisplayOverdueTag: OVERDUE com vencimento passado exibe atraso', () => {
  assert.equal(
    shouldDisplayOverdueTag({
      status: 'OVERDUE',
      dueDate: '2026-02-24',
      todayISODate: '2026-02-25',
      timeZone: 'America/Sao_Paulo',
    }),
    true
  )
})

test('shouldDisplayOverdueTag: pago nunca exibe atraso', () => {
  assert.equal(
    shouldDisplayOverdueTag({
      status: 'OVERDUE',
      dueDate: '2026-02-24',
      isPaid: true,
      todayISODate: '2026-02-25',
      timeZone: 'America/Sao_Paulo',
    }),
    false
  )
})

test('isPaidInCompetence: PAID sem pagamento da competencia nao deve contar como pago', () => {
  assert.equal(
    isPaidInCompetence({
      status: 'PAID',
      periodStart: '2026-02-25',
      periodEnd: '2026-03-24',
      paymentCurrentCycle: null,
      payment: null,
    }),
    false
  )
})

test('isPaidInCompetence: paymentCurrentCycle com dueDate dentro da competencia conta como pago', () => {
  assert.equal(
    isPaidInCompetence({
      status: 'PAID',
      periodStart: '2026-02-25',
      periodEnd: '2026-03-24',
      paymentCurrentCycle: {
        id: 'p1',
        dueDate: '2026-03-10',
      },
      payment: null,
    }),
    true
  )
})

test('isPaidInCompetence: payment legacy fora da competencia nao conta como pago', () => {
  assert.equal(
    isPaidInCompetence({
      status: 'PAID',
      periodStart: '2026-02-25',
      periodEnd: '2026-03-24',
      paymentCurrentCycle: null,
      payment: {
        id: 'legacy',
        dueDate: '2026-02-10',
      },
    }),
    false
  )
})

test('isPaidInCompetence: periodKey diferente da competencia selecionada nao conta como pago', () => {
  assert.equal(
    isPaidInCompetence({
      status: 'PAID',
      selectedMonthKey: '2026-03',
      periodStart: '2026-02-25',
      periodEnd: '2026-03-24',
      paymentCurrentCycle: {
        id: 'p1',
        periodKey: '2026-02',
        dueDate: '2026-02-25',
      },
      payment: null,
    }),
    false
  )
})

test('isPaidInCompetence: periodKey igual a competencia selecionada conta como pago', () => {
  assert.equal(
    isPaidInCompetence({
      status: 'PAID',
      selectedMonthKey: '2026-03',
      periodStart: '2026-02-25',
      periodEnd: '2026-03-24',
      paymentCurrentCycle: {
        id: 'p2',
        periodKey: '2026-03',
        dueDate: '2026-02-25',
      },
      payment: null,
    }),
    true
  )
})
