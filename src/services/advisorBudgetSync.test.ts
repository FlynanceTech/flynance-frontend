/**
 * Testes da lógica de sincronização Budget → GoalControls.
 *
 * Esses testes validam as funções puras do módulo de sincronização:
 * - que a função retorna a URL correta com e sem monthYear;
 * - que os tipos e contratos estão corretos.
 *
 * Os testes de integração real (chamadas HTTP) dependem do backend e ficam
 * em ambiente de e2e.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

// ─── Helpers internos para testar lógica pura ────────────────────────────────

function buildSyncUrl(clientUserId: string, monthYear?: string): string {
  const query = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : ''
  return `/advisor/clients/${clientUserId}/budget-plan/sync-controls${query}`
}

function buildBudgetPlanUrl(clientUserId: string, monthYear?: string): string {
  const query = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : ''
  return `/advisor/clients/${clientUserId}/budget-plan${query}`
}

// ─── syncBudgetToGoalControls URL builder ────────────────────────────────────

test('sync URL sem monthYear não inclui query string', () => {
  const url = buildSyncUrl('client-abc')
  assert.equal(url, '/advisor/clients/client-abc/budget-plan/sync-controls')
})

test('sync URL com monthYear inclui query string codificada', () => {
  const url = buildSyncUrl('client-abc', '2026-06')
  assert.equal(url, '/advisor/clients/client-abc/budget-plan/sync-controls?monthYear=2026-06')
})

test('sync URL com monthYear especial é codificado corretamente', () => {
  const url = buildSyncUrl('client-abc', '2026/06')
  assert.equal(url, '/advisor/clients/client-abc/budget-plan/sync-controls?monthYear=2026%2F06')
})

// ─── Budget plan URL builder ──────────────────────────────────────────────────

test('budget plan URL sem monthYear não inclui query string', () => {
  const url = buildBudgetPlanUrl('client-xyz')
  assert.equal(url, '/advisor/clients/client-xyz/budget-plan')
})

test('budget plan URL com monthYear inclui query string', () => {
  const url = buildBudgetPlanUrl('client-xyz', '2026-01')
  assert.equal(url, '/advisor/clients/client-xyz/budget-plan?monthYear=2026-01')
})

// ─── Regras de permissão de cliente com advisor ───────────────────────────────

/**
 * canWriteControl replicada aqui para testar a lógica pura sem React.
 */
function canWriteControl(
  control: { userId?: string; managedByAdvisorId?: string | null },
  currentUserId: string,
  clientIsReadOnly: boolean
): boolean {
  if (clientIsReadOnly) return false
  return (!control.userId || control.userId === currentUserId) && !control.managedByAdvisorId
}

test('cliente com advisor não pode editar nenhum controle', () => {
  const control = { userId: 'user-1', managedByAdvisorId: null }
  assert.equal(canWriteControl(control, 'user-1', true), false)
})

test('cliente sem advisor pode editar próprio controle', () => {
  const control = { userId: 'user-1', managedByAdvisorId: null }
  assert.equal(canWriteControl(control, 'user-1', false), true)
})

test('controle com managedByAdvisorId não pode ser editado mesmo sem clientIsReadOnly', () => {
  const control = { userId: 'user-1', managedByAdvisorId: 'advisor-99' }
  assert.equal(canWriteControl(control, 'user-1', false), false)
})

test('cliente sem advisor não pode editar controle de outro usuário', () => {
  const control = { userId: 'other-user', managedByAdvisorId: null }
  assert.equal(canWriteControl(control, 'user-1', false), false)
})

// ─── MyAdvisor hook lógica ───────────────────────────────────────────────────

function resolveHasAdvisor(
  myAdvisorData: object | null,
  isAdvisorActing: boolean
): boolean {
  return !isAdvisorActing && Boolean(myAdvisorData)
}

test('cliente com advisor retorna hasAdvisor=true quando não é advisor atuando', () => {
  const myAdvisor = { advisorUserId: 'adv-1', advisorName: 'João', advisorEmail: 'j@j.com', permission: 'READ_ONLY', status: 'ACTIVE' }
  assert.equal(resolveHasAdvisor(myAdvisor, false), true)
})

test('advisor atuando como cliente retorna hasAdvisor=false', () => {
  const myAdvisor = { advisorUserId: 'adv-1', advisorName: 'João', advisorEmail: 'j@j.com', permission: 'READ_ONLY', status: 'ACTIVE' }
  assert.equal(resolveHasAdvisor(myAdvisor, true), false)
})

test('usuário sem advisor retorna hasAdvisor=false', () => {
  assert.equal(resolveHasAdvisor(null, false), false)
})

// ─── Status de progresso ──────────────────────────────────────────────────────

type ProgressStatus = 'ok' | 'warning' | 'danger' | 'exceeded'

function resolveProgressStatus(pct: number): ProgressStatus {
  if (pct >= 100) return 'exceeded'
  if (pct >= 85) return 'danger'
  if (pct >= 70) return 'warning'
  return 'ok'
}

test('abaixo de 70% retorna status ok', () => {
  assert.equal(resolveProgressStatus(50), 'ok')
  assert.equal(resolveProgressStatus(69.9), 'ok')
})

test('entre 70% e 84.9% retorna status warning', () => {
  assert.equal(resolveProgressStatus(70), 'warning')
  assert.equal(resolveProgressStatus(84.9), 'warning')
})

test('entre 85% e 99.9% retorna status danger', () => {
  assert.equal(resolveProgressStatus(85), 'danger')
  assert.equal(resolveProgressStatus(99.9), 'danger')
})

test('100% ou acima retorna status exceeded', () => {
  assert.equal(resolveProgressStatus(100), 'exceeded')
  assert.equal(resolveProgressStatus(150), 'exceeded')
})
