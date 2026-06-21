import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canCreateGoalControl,
  canWriteGoalControl,
  isGoalControlLockedForClient,
} from './controlWriteAccess.ts'

test('cliente não pode editar meta criada pelo Advisor', () => {
  const control = { userId: 'client-1', managedByAdvisorId: 'advisor-1' }
  assert.equal(canWriteGoalControl(control, 'client-1', false), false)
  assert.equal(isGoalControlLockedForClient(control, false), true)
})

test('cliente não pode apagar meta criada pelo Advisor', () => {
  assert.equal(
    canWriteGoalControl(
      { userId: 'client-1', managedByAdvisorId: 'advisor-1' },
      'client-1',
      false
    ),
    false
  )
})

test('cliente vinculado a Advisor não pode criar nova meta', () => {
  assert.equal(canCreateGoalControl(true, false), false)
})

test('Advisor continua podendo editar a meta gerenciada', () => {
  assert.equal(
    canWriteGoalControl(
      { userId: 'client-1', managedByAdvisorId: 'advisor-1' },
      'advisor-1',
      true
    ),
    true
  )
})

test('cliente sem Advisor pode editar a própria meta', () => {
  assert.equal(
    canWriteGoalControl({ userId: 'client-1', managedByAdvisorId: null }, 'client-1', false),
    true
  )
})
