import assert from 'node:assert/strict'
import test from 'node:test'
import { buildUserCyclePreferences } from './cyclePreferences'
import { resolveCompetenceRange } from './resolveCompetenceRange'

test('resolveCompetenceRange: closeDay=24 em 2026-02 => 2026-01-25..2026-02-24', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'cutoff_day',
    cutoffDay: 24,
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-02', preferences)
  assert.equal(result.periodStart, '2026-01-25')
  assert.equal(result.periodEnd, '2026-02-24')
  assert.equal(result.label, 'Fev/2026 (25/01 a 24/02)')
})

test('resolveCompetenceRange: closeDay=24 em 2026-03 => 2026-02-25..2026-03-24', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'cutoff_day',
    cutoffDay: 24,
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-03', preferences)
  assert.equal(result.periodStart, '2026-02-25')
  assert.equal(result.periodEnd, '2026-03-24')
  assert.equal(result.label, 'Mar/2026 (25/02 a 24/03)')
})

test('resolveCompetenceRange: fixed_payday=25 em 2026-02 => 2026-01-25..2026-02-24', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'fixed_payday',
    paydayDay: 25,
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-02', preferences)
  assert.equal(result.periodStart, '2026-01-25')
  assert.equal(result.periodEnd, '2026-02-24')
  assert.equal(result.label, 'Fev/2026 (25/01 a 24/02)')
})

test('resolveCompetenceRange: fixed_payday=25 em 2026-03 => 2026-02-25..2026-03-24', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'fixed_payday',
    paydayDay: 25,
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-03', preferences)
  assert.equal(result.periodStart, '2026-02-25')
  assert.equal(result.periodEnd, '2026-03-24')
  assert.equal(result.label, 'Mar/2026 (25/02 a 24/03)')
})

test('resolveCompetenceRange: autonomous/cutoff_day=10 em 2026-02 => 2026-01-11..2026-02-10', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'cutoff_day',
    cutoffDay: 10,
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-02', preferences)
  assert.equal(result.periodStart, '2026-01-11')
  assert.equal(result.periodEnd, '2026-02-10')
  assert.equal(result.label, 'Fev/2026 (11/01 a 10/02)')
})

test('resolveCompetenceRange: closingDay=1 usa mes calendario', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'cutoff_day',
    cutoffDay: 1,
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-02', preferences)
  assert.equal(result.periodStart, '2026-02-01')
  assert.equal(result.periodEnd, '2026-02-28')
  assert.equal(result.label, 'Fev/2026 (01/02 a 28/02)')
})

test('resolveCompetenceRange: autonomous/calendar_month em 2026-02 => 2026-02-01..2026-02-28', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'calendar_month',
    timezone: 'America/Sao_Paulo',
  })

  const result = resolveCompetenceRange('2026-02', preferences)
  assert.equal(result.periodStart, '2026-02-01')
  assert.equal(result.periodEnd, '2026-02-28')
  assert.equal(result.label, 'Fev/2026 (01/02 a 28/02)')
})

test('resolveCompetenceRange: fixed_payday=31 aplica clamp em fevereiro bissexto e nao bissexto', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'fixed_payday',
    paydayDay: 31,
    timezone: 'America/Sao_Paulo',
  })

  const leapYear = resolveCompetenceRange('2024-02', preferences)
  assert.equal(leapYear.periodStart, '2024-01-31')
  assert.equal(leapYear.periodEnd, '2024-02-28')

  const nonLeapYear = resolveCompetenceRange('2026-02', preferences)
  assert.equal(nonLeapYear.periodStart, '2026-01-31')
  assert.equal(nonLeapYear.periodEnd, '2026-02-27')
})

test('resolveCompetenceRange: autonomous/cutoff_day=31 aplica clamp em fevereiro bissexto e nao bissexto', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'cutoff_day',
    cutoffDay: 31,
    timezone: 'America/Sao_Paulo',
  })

  const leapYear = resolveCompetenceRange('2024-02', preferences)
  assert.equal(leapYear.periodStart, '2024-02-01')
  assert.equal(leapYear.periodEnd, '2024-02-29')

  const nonLeapYear = resolveCompetenceRange('2026-02', preferences)
  assert.equal(nonLeapYear.periodStart, '2026-02-01')
  assert.equal(nonLeapYear.periodEnd, '2026-02-28')
})
