import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ADVISOR_READ_ONLY_FRIENDLY_MESSAGE,
  mapTransactionWriteErrorMessage,
} from './transactions'

test('maps backend read-only permission message to friendly PT-BR text', () => {
  const message = 'Advisor has read-only permission for this client.'
  assert.equal(mapTransactionWriteErrorMessage(message), ADVISOR_READ_ONLY_FRIENDLY_MESSAGE)
})

test('keeps unknown error messages unchanged', () => {
  const message = 'Erro inesperado no servidor.'
  assert.equal(mapTransactionWriteErrorMessage(message), message)
})
