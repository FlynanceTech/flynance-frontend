import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('verify-code persiste token do app e billingCheckoutToken sem sobrescrever um pelo outro', () => {
  const source = readSource('src/services/auth.ts')
  const loginSource = readSource('src/app/login/page.tsx')

  assert.match(source, /api\.post\('\/auth\/verify-code', payload, \{ withCredentials: true \}\)/)
  assert.match(source, /const token = extractAuthToken\(res\.data\)/)
  assert.match(source, /const billingCheckoutToken = captureBillingCheckoutSessionFromPayload\(res\.data\)/)
  assert.match(source, /persistAuthToken\(token\)/)
  assert.match(source, /return \{ \.\.\.res\.data, token, billingCheckoutToken \}/)
  assert.match(loginSource, /syncBillingCheckoutSessionIdentity\(\{/)
})

test('cadastro limpa billingCheckoutToken anterior e captura o novo token curto retornado por POST /user', () => {
  const signupSource = readSource('src/components/cadastro/SignupStepper.tsx')
  const usersSource = readSource('src/services/users.ts')

  assert.match(signupSource, /clearBillingCheckoutSession\(\)/)
  assert.match(signupSource, /const created = await createMutation\.mutateAsync\(body\)/)
  assert.match(signupSource, /billingCheckoutToken: created\.billingCheckoutToken \?\? ''/)
  assert.match(usersSource, /const billingCheckoutToken = captureBillingCheckoutSessionFromPayload\(response\.data\)/)
  assert.match(usersSource, /return \{\s*\.\.\.response\.data,\s*billingCheckoutToken,/)
})

test('artefatos de sessao limpam token do app e token curto sem limpar todo o localStorage', () => {
  const authSessionSource = readSource('src/lib/authSession.ts')
  const userSessionSource = readSource('src/stores/useUserSession.ts')

  assert.match(authSessionSource, /clearPersistedAuthToken\(\)/)
  assert.match(authSessionSource, /clearBillingCheckoutSession\(\)/)
  assert.match(userSessionSource, /clearAuthSessionArtifacts\(\)/)
  assert.doesNotMatch(userSessionSource, /localStorage\.clear\(\)/)
})

test('convite de conta casal e publico para preservar o motivo no login', () => {
  const authGuardSource = readSource('src/providers/authGuardProvider.tsx')
  const invitePageSource = readSource('src/app/conta-casal/convite/[token]/page.tsx')
  const loginSource = readSource('src/app/login/page.tsx')

  assert.match(authGuardSource, /pathname\?\.startsWith\("\/conta-casal\/convite\/"\) === true/)
  assert.match(invitePageSource, /reason: 'couple_invite'/)
  assert.match(loginSource, /reason === 'couple_invite'/)
  assert.match(loginSource, /showCoupleInviteNotice/)
})
