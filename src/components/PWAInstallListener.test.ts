import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('PWAInstallListener sincroniza appinstalled para pwaInstalled=true via PATCH', () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/PWAInstallListener.tsx'),
    'utf8'
  )

  assert.match(source, /window\.addEventListener\('appinstalled'/)
  assert.match(source, /updateUserPreferences\(\{\s*pwaInstalled:\s*true,/)
  assert.match(source, /pwaInstalledAt:\s*new Date\(\)\.toISOString\(\)/)
})
