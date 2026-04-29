import api from '@/lib/axios'
import { getUserAppPreferences, updateUserAppPreferences } from '@/services/userAppPreferences'
import type {
  PushApiMutationResult,
  PushSubscriptionDeletePayload,
  PushSubscriptionPayload,
  PushUserPreferencesPatch,
} from '@/types/pushNotifications'
import type { UserPreferences } from '@/types/userPreferences'
import { getErrorMessage } from '@/utils/getErrorMessage'

const PUSH_API_MOCK_STORAGE_KEY = 'flynance:push:mock-subscriptions'

type MockPushSubscriptionState = {
  subscriptions: PushSubscriptionPayload[]
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function debugPushApi(message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'production') return
  if (meta === undefined) {
    console.debug(`[push-api] ${message}`)
    return
  }
  console.debug(`[push-api] ${message}`, meta)
}

export function isPushApiMockEnabled() {
  return process.env.NEXT_PUBLIC_PUSH_API_MOCKS === 'true'
}

function readMockPushState(): MockPushSubscriptionState {
  if (!isBrowser()) return { subscriptions: [] }

  try {
    const rawValue = window.localStorage.getItem(PUSH_API_MOCK_STORAGE_KEY)
    if (!rawValue) return { subscriptions: [] }

    const parsed = JSON.parse(rawValue) as Partial<MockPushSubscriptionState>
    return {
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
    }
  } catch {
    return { subscriptions: [] }
  }
}

function writeMockPushState(state: MockPushSubscriptionState) {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(PUSH_API_MOCK_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // noop
  }
}

function upsertMockPushSubscription(payload: PushSubscriptionPayload) {
  const currentState = readMockPushState()
  const nextSubscriptions = currentState.subscriptions.filter(
    (subscription) => subscription.endpoint !== payload.endpoint
  )

  nextSubscriptions.push(payload)
  writeMockPushState({ subscriptions: nextSubscriptions })
}

function removeMockPushSubscription(endpoint: string) {
  const currentState = readMockPushState()
  const nextSubscriptions = currentState.subscriptions.filter(
    (subscription) => subscription.endpoint !== endpoint
  )

  writeMockPushState({ subscriptions: nextSubscriptions })
}

export async function getUserPreferences(): Promise<UserPreferences> {
  return getUserAppPreferences()
}

export async function updateUserPreferences(
  payload: PushUserPreferencesPatch
): Promise<UserPreferences> {
  return updateUserAppPreferences(payload)
}

export async function createPushSubscription(
  payload: PushSubscriptionPayload
): Promise<PushApiMutationResult> {
  if (isPushApiMockEnabled()) {
    upsertMockPushSubscription(payload)
    debugPushApi('Push subscription salva em mock local.', payload.endpoint)
    return { mocked: true }
  }

  try {
    await api.post('/push-subscriptions', payload)
    return { mocked: false }
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(error, 'Nao foi possivel sincronizar a inscricao de notificacao.')
    )
  }
}

export async function deletePushSubscription(
  payload: PushSubscriptionDeletePayload
): Promise<PushApiMutationResult> {
  if (isPushApiMockEnabled()) {
    removeMockPushSubscription(payload.endpoint)
    debugPushApi('Push subscription removida em mock local.', payload.endpoint)
    return { mocked: true }
  }

  try {
    await api.delete('/push-subscriptions', { data: payload })
    return { mocked: false }
  } catch (error: unknown) {
    throw new Error(
      getErrorMessage(error, 'Nao foi possivel remover a inscricao de notificacao.')
    )
  }
}
