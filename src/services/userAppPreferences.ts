import api from '@/lib/axios'
import { getErrorMessage } from '@/utils/getErrorMessage'
import type {
  LoginPreference,
  UserTheme,
  UserPreferences,
  UserPreferencesPatch,
} from '@/types/userPreferences'

const DEFAULT_CURRENCY = 'BRL'
const DEFAULT_LOCALE = 'pt-BR'
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'
const DEFAULT_LOGIN_PREFERENCE: LoginPreference = 'AUTO'
const DEFAULT_THEME: UserTheme = 'LIGHT'

const PATCHABLE_KEYS: Array<keyof UserPreferencesPatch> = [
  'currency',
  'locale',
  'timezone',
  'theme',
  'pwaInstalled',
  'pwaInstalledAt',
  'notificationsEnabled',
  'notificationInApp',
  'notificationEmail',
  'notificationWhatsapp',
  'notificationPush',
  'dailyNoTransactionNudgeEnabled',
  'loginPreference',
]

const PREFERENCE_HINT_KEYS = [
  'currency',
  'locale',
  'timezone',
  'timeZone',
  'time_zone',
  'theme',
  'themeMode',
  'theme_mode',
  'pwaInstalled',
  'pwa_installed',
  'notificationsEnabled',
  'notifications_enabled',
  'notificationInApp',
  'notification_in_app',
  'notificationEmail',
  'notification_email',
  'notificationWhatsapp',
  'notification_whatsapp',
  'notificationPush',
  'notification_push',
  'dailyNoTransactionNudgeEnabled',
  'daily_no_transaction_nudge_enabled',
  'loginPreference',
  'login_preference',
] as const

const PREFERENCE_CONTAINER_KEYS = ['preferences', 'userPreferences', 'user_preferences'] as const
const RESPONSE_CONTAINER_KEYS = ['data', 'payload', 'result'] as const

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickFirstValue(
  record: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    if (key in record) return record[key]
  }
  return undefined
}

function hasPreferenceHints(record: Record<string, unknown>) {
  return PREFERENCE_HINT_KEYS.some((key) => key in record)
}

function browserTimezone() {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (typeof tz === 'string' && tz.trim()) return tz
  }
  return DEFAULT_TIMEZONE
}

function toStringValue(value: unknown, fallback: string) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return fallback
  }
  const normalized = String(value).trim()
  return normalized || fallback
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null || value === '') return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === '1') return true
    if (normalized === 'false') return false
    if (normalized === '0') return false
  }
  return fallback
}

function normalizeLoginPreference(value: unknown): LoginPreference {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  if (normalized === 'EMAIL') return 'EMAIL'
  if (normalized === 'WHATSAPP') return 'WHATSAPP'
  return DEFAULT_LOGIN_PREFERENCE
}

function normalizeCurrency(value: unknown) {
  return toStringValue(value, DEFAULT_CURRENCY).toUpperCase()
}

function normalizeLocale(value: unknown) {
  return toStringValue(value, DEFAULT_LOCALE)
}

function normalizeTimezone(value: unknown) {
  return toStringValue(value, browserTimezone())
}

function normalizeThemePreference(value: unknown): UserTheme {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'dark') return 'DARK'
  return DEFAULT_THEME
}

export function extractPreferencesPayload(payload: unknown): Record<string, unknown> | null {
  const queue: unknown[] = [payload]
  const visited = new Set<unknown>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)

    const record = toRecord(current)
    if (!record) continue

    if (hasPreferenceHints(record)) {
      return record
    }

    RESPONSE_CONTAINER_KEYS.forEach((key) => {
      if (record[key] !== undefined) {
        queue.push(record[key])
      }
    })

    PREFERENCE_CONTAINER_KEYS.forEach((key) => {
      if (record[key] !== undefined) {
        queue.push(record[key])
      }
    })

    if ('userData' in record) queue.push(record.userData)
    if ('user' in record) queue.push(record.user)
  }

  return null
}

export function createDefaultUserPreferences(userId = ''): UserPreferences {
  const nowIso = new Date().toISOString()
  return {
    id: '',
    userId: String(userId || '').trim(),
    currency: DEFAULT_CURRENCY,
    locale: DEFAULT_LOCALE,
    timezone: browserTimezone(),
    theme: DEFAULT_THEME,
    pwaInstalled: false,
    pwaInstalledAt: null,
    notificationsEnabled: true,
    notificationInApp: true,
    notificationEmail: true,
    notificationWhatsapp: false,
    notificationPush: false,
    dailyNoTransactionNudgeEnabled: true,
    loginPreference: DEFAULT_LOGIN_PREFERENCE,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

export function normalizeUserPreferences(input: unknown, fallbackUserId = ''): UserPreferences {
  const raw = (input ?? {}) as Record<string, unknown>
  const defaults = createDefaultUserPreferences(fallbackUserId)
  const userId = toStringValue(
    pickFirstValue(raw, ['userId', 'user_id']),
    defaults.userId
  )

  return {
    id: toStringValue(pickFirstValue(raw, ['id']), defaults.id),
    userId,
    currency: normalizeCurrency(pickFirstValue(raw, ['currency'])),
    locale: normalizeLocale(pickFirstValue(raw, ['locale'])),
    timezone: normalizeTimezone(pickFirstValue(raw, ['timezone', 'timeZone', 'time_zone'])),
    theme: normalizeThemePreference(pickFirstValue(raw, ['theme', 'themeMode', 'theme_mode'])),
    pwaInstalled: toBoolean(
      pickFirstValue(raw, ['pwaInstalled', 'pwa_installed']),
      defaults.pwaInstalled
    ),
    pwaInstalledAt: toIsoOrNull(pickFirstValue(raw, ['pwaInstalledAt', 'pwa_installed_at'])),
    notificationsEnabled: toBoolean(
      pickFirstValue(raw, ['notificationsEnabled', 'notifications_enabled']),
      defaults.notificationsEnabled
    ),
    notificationInApp: toBoolean(
      pickFirstValue(raw, ['notificationInApp', 'notification_in_app']),
      defaults.notificationInApp
    ),
    notificationEmail: toBoolean(
      pickFirstValue(raw, ['notificationEmail', 'notification_email']),
      defaults.notificationEmail
    ),
    notificationWhatsapp: toBoolean(
      pickFirstValue(raw, ['notificationWhatsapp', 'notification_whatsapp']),
      defaults.notificationWhatsapp
    ),
    notificationPush: toBoolean(
      pickFirstValue(raw, ['notificationPush', 'notification_push']),
      defaults.notificationPush
    ),
    dailyNoTransactionNudgeEnabled: toBoolean(
      pickFirstValue(raw, [
        'dailyNoTransactionNudgeEnabled',
        'daily_no_transaction_nudge_enabled',
      ]),
      defaults.dailyNoTransactionNudgeEnabled
    ),
    loginPreference: normalizeLoginPreference(
      pickFirstValue(raw, ['loginPreference', 'login_preference'])
    ),
    createdAt: toIsoOrNull(pickFirstValue(raw, ['createdAt', 'created_at'])) ?? defaults.createdAt,
    updatedAt: toIsoOrNull(pickFirstValue(raw, ['updatedAt', 'updated_at'])) ?? defaults.updatedAt,
  }
}

export function extractPreferencesFromAuthMePayload(
  payload: unknown,
  fallbackUserId = ''
): UserPreferences | null {
  const preferences = extractPreferencesPayload(payload)
  if (!preferences) return null
  return normalizeUserPreferences(preferences, fallbackUserId)
}

export function diffUserPreferences(base: UserPreferences, next: UserPreferences): UserPreferencesPatch {
  const patch: Partial<Record<keyof UserPreferencesPatch, unknown>> = {}

  PATCHABLE_KEYS.forEach((key) => {
    if (base[key] !== next[key]) {
      patch[key] = next[key]
    }
  })

  return patch as UserPreferencesPatch
}

export async function getUserAppPreferences(): Promise<UserPreferences> {
  try {
    const response = await api.get('/users/me/preferences')
    const extracted = extractPreferencesPayload(response.data)
    if (!extracted) {
      throw new Error('Resposta invalida ao carregar preferencias do usuario.')
    }
    return normalizeUserPreferences(extracted)
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Nao foi possivel carregar preferencias do usuario.')
    throw new Error(message)
  }
}

export async function updateUserAppPreferences(payload: UserPreferencesPatch): Promise<UserPreferences> {
  try {
    const response = await api.patch('/users/me/preferences', payload)
    const extracted = extractPreferencesPayload(response.data)
    if (extracted) {
      return normalizeUserPreferences(extracted)
    }

    // Alguns backends retornam apenas { ok: true } no PATCH.
    return await getUserAppPreferences()
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Nao foi possivel salvar preferencias do usuario.')
    throw new Error(message)
  }
}
