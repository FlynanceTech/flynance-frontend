import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('worker customizado trata push, click e rotacao de subscription', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'worker/index.ts'), 'utf8')

  assert.match(source, /self\.addEventListener\('push'/)
  assert.match(source, /self\.registration\.showNotification/)
  assert.match(source, /self\.addEventListener\('notificationclick'/)
  assert.match(source, /focusOrOpenNotificationTarget/)
  assert.match(source, /self\.addEventListener\('pushsubscriptionchange'/)
  assert.match(source, /pushManager\.subscribe\(/)
  assert.match(source, /broadcastMessage\(\{ type: 'PUSH_SUBSCRIPTION_DIRTY'/)
})
