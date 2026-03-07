import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('UserPreferencesCard conecta carregamento, diff e persistencia por PATCH parcial', () => {
  const source = readSource('src/components/perfil/UserPreferencesCard.tsx')

  assert.match(source, /useTranslations\('preferences'\)/)
  assert.match(source, /useUserAppPreferences\(\)/)
  assert.match(source, /const sourcePreferences = preferencesQuery\.data \?\? storePreferences/)
  assert.match(source, /const patch = diffUserPreferences\(baseline, nextPreferences\)/)
  assert.match(source, /updatePreferencesMutation\.mutateAsync\(patch\)/)
  assert.match(source, /if \(Object\.keys\(patch\)\.length === 0\)/)
  assert.match(source, /toast\.success\(t\('actions\.saveSuccess'\)\)/)
})

test('UserPreferencesCard oferece acao de instalar PWA quando nao detectado', () => {
  const source = readSource('src/components/perfil/UserPreferencesCard.tsx')

  assert.match(source, /window\.addEventListener\('beforeinstallprompt', onBeforeInstallPrompt\)/)
  assert.match(source, /const canShowPwaInstallAction = Boolean\(sourcePreferences && !sourcePreferences\.pwaInstalled\)/)
  assert.match(source, /handleInstallPwa/)
  assert.match(source, /t\('pwa\.installButton'\)/)
})

test('useUserSession faz bootstrap por /auth/me com fallback para /users/me/preferences', () => {
  const source = readSource('src/stores/useUserSession.ts')

  assert.match(source, /api\.get<SessionResponse>\('\/auth\/me'/)
  assert.match(source, /extractPreferencesFromAuthMePayload/)
  assert.match(source, /resolvedPreferences = await getUserAppPreferences\(\)/)
  assert.match(source, /fallback para preferencias vindas de \/auth\/me/)
  assert.match(source, /useUserPreferencesStore\.getState\(\)\.setPreferences\(resolvedPreferences\)/)
})
