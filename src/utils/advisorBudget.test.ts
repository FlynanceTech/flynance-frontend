import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBudgetLimitPayload,
  calculateBudgetSummary,
  calculateDistribution,
  maxCategoryValue,
  percentageToAmount,
  resolveBudgetAmount,
} from './advisorBudget.ts'

test('modo percentual calcula o valor sobre a receita estimada', () => {
  assert.equal(percentageToAmount(30, 1_000), 300)
  assert.equal(resolveBudgetAmount({ percentLimit: 50, nominalLimit: null }, 1_000), 500)
  assert.deepEqual(buildBudgetLimitPayload('percent', '30'), {
    nominalLimit: null,
    percentLimit: 30,
  })
})

test('modo nominal preserva o valor em reais', () => {
  assert.equal(resolveBudgetAmount({ nominalLimit: 300, percentLimit: null }, 1_000), 300)
  assert.deepEqual(buildBudgetLimitPayload('nominal', '300'), {
    nominalLimit: 300,
    percentLimit: null,
  })
})

test('soma das categorias não pode ultrapassar o limite do grupo', () => {
  const result = calculateDistribution(50, [20, 20, 15])
  assert.equal(result.distributed, 55)
  assert.equal(result.remaining, -5)
  assert.equal(result.exceedsGroup, true)
})

test('valor máximo de uma categoria respeita o saldo restante', () => {
  assert.equal(maxCategoryValue(50, [20, 20]), 10)
})

test('soma dos grupos não pode ultrapassar a receita', () => {
  const result = calculateBudgetSummary([500, 400, 200], 1_000)
  assert.equal(result.totalBudgeted, 1_100)
  assert.ok(result.percentage != null && Math.abs(result.percentage - 110) < 0.000001)
  assert.equal(result.exceedsIncome, true)
})

test('alerta preventivo aparece a partir de 80% da receita', () => {
  assert.equal(calculateBudgetSummary([500, 300], 1_000).shouldWarn, true)
  assert.equal(calculateBudgetSummary([500, 299], 1_000).shouldWarn, false)
})
