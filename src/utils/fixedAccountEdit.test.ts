import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFixedAccountEditPayload,
  toISODateOnlyFromDatePicker,
} from './fixedAccountEdit'
import { parseBrDate, toApiDate } from './apiDate'

test('buildFixedAccountEditPayload: edicao 28/01/2026 -> 10/02/2026 atualiza startDate e dueDay', () => {
  const baseInput = {
    name: 'Luz (Light)',
    amount: 320.23,
    categoryId: 'cat-1',
    notes: '',
  }

  const initialDate = parseBrDate('28/01/2026')
  const editedDate = parseBrDate('10/02/2026')

  const initialPayload = buildFixedAccountEditPayload({
    ...baseInput,
    startDateInput: initialDate,
  })
  assert.ok(initialPayload)
  assert.equal(initialPayload.startDate, toApiDate(initialDate))
  assert.equal(initialPayload.dueDay, 28)

  const editedPayload = buildFixedAccountEditPayload({
    ...baseInput,
    startDateInput: editedDate,
  })
  assert.ok(editedPayload)
  assert.equal(editedPayload.startDate, toApiDate(editedDate))
  assert.equal(editedPayload.dueDay, 10)
})

test('buildFixedAccountEditPayload: payload de edicao sempre usa data ISO', () => {
  const payload = buildFixedAccountEditPayload({
    name: 'Luz (Light)',
    amount: 320.23,
    categoryId: 'cat-1',
    notes: 'Conta de energia',
    startDateInput: '2026-02-10',
  })

  assert.ok(payload)
  assert.equal(payload.startDate, '2026-02-10')
  assert.match(payload.startDate, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(payload.dueDay, 10)
})

test('toISODateOnlyFromDatePicker: extrai YYYY-MM-DD sem shift de timestamp ISO', () => {
  const normalized = toISODateOnlyFromDatePicker('2026-02-10T00:00:00.000Z')
  assert.equal(normalized, '2026-02-10')
})

test('buildFixedAccountEditPayload: data invalida bloqueia payload', () => {
  const payload = buildFixedAccountEditPayload({
    name: 'Luz (Light)',
    amount: 320.23,
    startDateInput: '2026-02-31',
  })

  assert.equal(payload, null)
})

test('buildFixedAccountEditPayload: bloqueia dd/MM/yyyy para payload de API', () => {
  const payload = buildFixedAccountEditPayload({
    name: 'Luz (Light)',
    amount: 320.23,
    startDateInput: '10/02/2026',
  })

  assert.equal(payload, null)
})
