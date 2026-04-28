import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('pushApiClient delega preferencias e isola os endpoints de push', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'src/services/pushApiClient.ts'),
    'utf8'
  )

  assert.match(source, /getUserAppPreferences/)
  assert.match(source, /updateUserAppPreferences/)
  assert.match(source, /api\.post\('\/push-subscriptions', payload\)/)
  assert.match(source, /api\.delete\('\/push-subscriptions', \{ data: payload \}\)/)
  assert.match(source, /NEXT_PUBLIC_PUSH_API_MOCKS/)
})
