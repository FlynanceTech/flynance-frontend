import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCurrency } from './formatter'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'
import { createDefaultUserPreferences } from '@/services/userAppPreferences'

test('formatCurrency usa locale/currency da preferencia do usuario', () => {
  const previous = useUserPreferencesStore.getState().preferences
  const next = {
    ...createDefaultUserPreferences('user-formatter'),
    locale: 'en-US',
    currency: 'USD',
  }

  useUserPreferencesStore.getState().setPreferences(next)

  try {
    const formatted = formatCurrency(1234.56)
    assert.match(formatted, /^\$/)
    assert.match(formatted, /1,234\.56/)
  } finally {
    useUserPreferencesStore.getState().setPreferences(previous)
  }
})

test('formatCurrency faz fallback seguro para BRL quando moeda invalida', () => {
  const formatted = formatCurrency(10, { locale: 'pt-BR', currency: 'invalid-currency' })
  assert.match(formatted, /^R\$/)
})
