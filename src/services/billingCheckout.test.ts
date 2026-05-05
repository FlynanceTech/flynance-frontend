import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('servico de billing onboarding usa cliente sem cookies e envia JWT ou billingCheckoutToken', () => {
  const source = readSource('src/services/billingCheckout.ts')

  assert.match(source, /const billingCheckoutApi = axios\.create\(\{[\s\S]*withCredentials: false,/)
  assert.match(source, /const appToken = readPersistedAuthToken\(\)/)
  assert.match(source, /Authorization: `Bearer \$\{appToken\}`/)
  assert.match(source, /const billingCheckoutToken = readBillingCheckoutToken\(\)/)
  assert.match(source, /'x-billing-checkout-token': billingCheckoutToken/)
  assert.match(source, /\{ billingCheckoutToken: auth\.billingCheckoutToken \}/)
})

test('servico de billing onboarding invalida token curto expirado sem recorrer ao JWT antigo', () => {
  const source = readSource('src/services/billingCheckout.ts')

  assert.match(source, /class BillingCheckoutTokenError extends Error/)
  assert.match(source, /throw new BillingCheckoutTokenError\(\)/)
  assert.match(source, /clearBillingCheckoutSession\(\)/)
  assert.match(source, /isBillingCheckoutTokenError\(error: unknown\)/)
})
