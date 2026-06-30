import test from 'node:test'
import assert from 'node:assert/strict'

import { getAdvisorHomePath } from './roles'

test('organization roles open the organization dashboard', () => {
  assert.equal(getAdvisorHomePath('ORG_ADMIN'), '/advisor/organization/dashboard')
  assert.equal(getAdvisorHomePath('MASTER'), '/advisor/organization/dashboard')
  assert.equal(getAdvisorHomePath('consultant-manager'), '/advisor/organization/dashboard')
})

test('individual advisors open the advisor dashboard', () => {
  assert.equal(getAdvisorHomePath('ADVISOR'), '/advisor')
})
