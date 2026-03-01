import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildUserCyclePreferences,
  parseStoredUserCyclePreferences,
} from './cyclePreferences'

test('buildUserCyclePreferences: fixed_payday exige paydayDay e limpa campos de autonomo', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'fixed_payday',
    paydayDay: 25,
    timezone: 'America/Sao_Paulo',
  })

  assert.equal(preferences.cycleMode, 'fixed_payday')
  assert.equal(preferences.paydayDay, 25)
  assert.equal(preferences.autonomousCycleKind, null)
  assert.equal(preferences.cutoffDay, null)
})

test('buildUserCyclePreferences: autonomous cutoff_day exige cutoffDay', () => {
  const preferences = buildUserCyclePreferences({
    cycleMode: 'autonomous',
    autonomousCycleKind: 'cutoff_day',
    cutoffDay: 10,
    timezone: 'America/Sao_Paulo',
  })

  assert.equal(preferences.cycleMode, 'autonomous')
  assert.equal(preferences.paydayDay, null)
  assert.equal(preferences.autonomousCycleKind, 'cutoff_day')
  assert.equal(preferences.cutoffDay, 10)
})

test('buildUserCyclePreferences: fixed_payday sem paydayDay falha', () => {
  assert.throws(() =>
    buildUserCyclePreferences({
      cycleMode: 'fixed_payday',
      timezone: 'America/Sao_Paulo',
    })
  )
})

test('parseStoredUserCyclePreferences: fallback para default em payload invalido', () => {
  const preferences = parseStoredUserCyclePreferences('{"invalid":true}')
  assert.equal(preferences.cycleMode, 'autonomous')
  assert.equal(preferences.autonomousCycleKind, 'calendar_month')
})
