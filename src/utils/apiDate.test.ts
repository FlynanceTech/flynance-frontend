import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBrDate, toApiDate } from './apiDate'

test('parseBrDate: converte dd/MM/yyyy para Date local valida', () => {
  const parsed = parseBrDate('10/02/2026')
  assert.equal(parsed.getFullYear(), 2026)
  assert.equal(parsed.getMonth(), 1)
  assert.equal(parsed.getDate(), 10)
})

test('toApiDate: converte Date local para YYYY-MM-DD', () => {
  const localDate = parseBrDate('10/02/2026')
  assert.equal(toApiDate(localDate), '2026-02-10')
})

test('toApiDate: preserva YYYY-MM-DD sem timezone shift', () => {
  assert.equal(toApiDate('2026-02-10T00:00:00.000Z'), '2026-02-10')
})

test('toApiDate: bloqueia string dd/MM/yyyy para payload de API', () => {
  assert.throws(() => toApiDate('10/02/2026'))
})
