import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('checkout usa servico centralizado de billing onboarding e nao depende do cliente autenticado do app', () => {
  const source = readSource('src/components/cadastro/checkoutStepper.tsx')

  assert.match(source, /createBillingCheckoutSetupIntent/)
  assert.match(source, /createBillingCheckoutSubscription/)
  assert.match(source, /userId: ensuredUser\.id,/)
  assert.doesNotMatch(source, /api\.post\("\/billing\/setup-intent"/)
  assert.doesNotMatch(source, /api\.post\("\/billing\/subscription"/)
  assert.doesNotMatch(source, /publicBillingApi\.post\("\/billing\/setup-intent"/)
  assert.doesNotMatch(source, /publicBillingApi\.post\("\/billing\/subscription"/)
})

test('checkout limpa token curto stale ao trocar identidade e preserva draft para reload', () => {
  const source = readSource('src/components/cadastro/checkoutStepper.tsx')

  assert.match(source, /doesBillingCheckoutSessionMatchIdentity\(\{/)
  assert.match(source, /clearBillingCheckoutSession\(\);/)
  assert.match(source, /function readCheckoutDraft\(\)/)
  assert.match(source, /function writeCheckoutDraft\(form: FormDTO\)/)
  assert.match(source, /clearCheckoutDraft\(\)/)
  assert.match(source, /setUserFly\(undefined\);\s*setLeadCreated\(false\);/)
})

test('checkout redireciona para nova validacao quando billingCheckoutToken expira e ainda tenta recuperar User not found', () => {
  const source = readSource('src/components/cadastro/checkoutStepper.tsx')

  assert.match(source, /if \(isBillingCheckoutTokenError\(err\)\) \{\s*redirectToCheckoutValidation\(/)
  assert.match(source, /router\.replace\(`\/login\?next=\$\{encodeURIComponent\(next\)\}`\)/)
  assert.match(
    source,
    /if \(!isUserNotFoundError\(err\)\) throw err;\s*ensuredUser = await resolveUserAndSync\(\);/
  )
  assert.match(source, /payload\.userId = ensuredUser\.id;/)
})
