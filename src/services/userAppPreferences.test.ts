import test from 'node:test'
import assert from 'node:assert/strict'
import api from '@/lib/axios'
import {
  createDefaultUserPreferences,
  diffUserPreferences,
  extractPreferencesPayload,
  extractPreferencesFromAuthMePayload,
  getUserAppPreferences,
  normalizeUserPreferences,
  updateUserAppPreferences,
} from './userAppPreferences'

test('normalizeUserPreferences aplica defaults e normaliza tipos', () => {
  const normalized = normalizeUserPreferences(
    {
      currency: 'usd',
      locale: 'en-US',
      time_zone: '',
      theme: 'dark',
      pwa_installed: 'true',
      notifications_enabled: 'false',
      login_preference: 'whatsapp',
    },
    'user-1'
  )

  assert.equal(normalized.userId, 'user-1')
  assert.equal(normalized.currency, 'USD')
  assert.equal(normalized.locale, 'en-US')
  assert.equal(normalized.theme, 'DARK')
  assert.equal(normalized.pwaInstalled, true)
  assert.equal(normalized.notificationsEnabled, false)
  assert.equal(normalized.loginPreference, 'WHATSAPP')
  assert.ok(typeof normalized.timezone === 'string' && normalized.timezone.length > 0)
})

test('extractPreferencesPayload suporta wrappers com data/preferences', () => {
  const extracted = extractPreferencesPayload({
    ok: true,
    data: {
      preferences: {
        currency: 'usd',
        locale: 'en-US',
      },
    },
  })

  assert.ok(extracted)
  assert.equal(extracted?.currency, 'usd')
  assert.equal(extracted?.locale, 'en-US')
})

test('extractPreferencesFromAuthMePayload extrai preferences de /auth/me', () => {
  const extracted = extractPreferencesFromAuthMePayload(
    {
      userData: { user: { id: 'user-42' } },
      preferences: {
        currency: 'eur',
        locale: 'es-ES',
      },
    },
    'fallback-id'
  )

  assert.ok(extracted)
  assert.equal(extracted?.currency, 'EUR')
  assert.equal(extracted?.locale, 'es-ES')
})

test('diffUserPreferences retorna somente campos alterados do PATCH', () => {
  const base = createDefaultUserPreferences('user-1')
  const next = {
    ...base,
    locale: 'en-US',
    currency: 'USD',
    notificationsEnabled: false,
  }

  const patch = diffUserPreferences(base, next)
  assert.deepEqual(patch, {
    currency: 'USD',
    locale: 'en-US',
    notificationsEnabled: false,
  })
})

test('getUserAppPreferences usa GET /users/me/preferences e normaliza payload', async () => {
  const calls: Array<string> = []
  const originalGet = api.get.bind(api)

  ;(
    api.get as unknown as (url: string) => Promise<{ data: unknown }>
  ) = async (url: string) => {
    calls.push(url)
    return {
      data: {
        ok: true,
        data: {
          preferences: {
            user_id: 'user-99',
            currency: 'usd',
            locale: 'en-US',
            time_zone: 'America/New_York',
          },
        },
      },
    }
  }

  try {
    const preferences = await getUserAppPreferences()
    assert.deepEqual(calls, ['/users/me/preferences'])
    assert.equal(preferences.userId, 'user-99')
    assert.equal(preferences.currency, 'USD')
    assert.equal(preferences.locale, 'en-US')
    assert.equal(preferences.timezone, 'America/New_York')
  } finally {
    ;(api.get as unknown as typeof api.get) = originalGet
  }
})

test('updateUserAppPreferences envia PATCH parcial e retorna preferencias normalizadas', async () => {
  const calls: Array<{ url: string; data: unknown }> = []
  const originalPatch = api.patch.bind(api)
  const patchPayload = { notificationPush: true, loginPreference: 'EMAIL' as const }

  ;(
    api.patch as unknown as (url: string, data: unknown) => Promise<{ data: unknown }>
  ) = async (url: string, data: unknown) => {
    calls.push({ url, data })
    return {
      data: {
        userId: 'user-99',
        currency: 'brl',
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        notificationPush: true,
        loginPreference: 'EMAIL',
      },
    }
  }

  try {
    const updated = await updateUserAppPreferences(patchPayload)
    assert.deepEqual(calls, [{ url: '/users/me/preferences', data: patchPayload }])
    assert.equal(updated.currency, 'BRL')
    assert.equal(updated.notificationPush, true)
    assert.equal(updated.loginPreference, 'EMAIL')
  } finally {
    ;(api.patch as unknown as typeof api.patch) = originalPatch
  }
})

test('updateUserAppPreferences faz fallback de leitura quando PATCH nao retorna preferencias', async () => {
  const patchCalls: Array<{ url: string; data: unknown }> = []
  const getCalls: Array<string> = []
  const originalPatch = api.patch.bind(api)
  const originalGet = api.get.bind(api)

  ;(
    api.patch as unknown as (url: string, data: unknown) => Promise<{ data: unknown }>
  ) = async (url: string, data: unknown) => {
    patchCalls.push({ url, data })
    return { data: { ok: true } }
  }

  ;(
    api.get as unknown as (url: string) => Promise<{ data: unknown }>
  ) = async (url: string) => {
    getCalls.push(url)
    return {
      data: {
        preferences: {
          userId: 'user-200',
          currency: 'eur',
          locale: 'es-ES',
          timezone: 'Europe/Madrid',
          notificationPush: true,
          loginPreference: 'EMAIL',
        },
      },
    }
  }

  try {
    const updated = await updateUserAppPreferences({ notificationPush: true })
    assert.deepEqual(patchCalls, [{ url: '/users/me/preferences', data: { notificationPush: true } }])
    assert.deepEqual(getCalls, ['/users/me/preferences'])
    assert.equal(updated.userId, 'user-200')
    assert.equal(updated.currency, 'EUR')
    assert.equal(updated.notificationPush, true)
    assert.equal(updated.loginPreference, 'EMAIL')
  } finally {
    ;(api.patch as unknown as typeof api.patch) = originalPatch
    ;(api.get as unknown as typeof api.get) = originalGet
  }
})
