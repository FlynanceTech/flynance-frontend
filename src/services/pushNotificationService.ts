import { createPushSubscription, deletePushSubscription } from '@/services/pushApiClient'
import {
  getReadyServiceWorkerRegistration,
  isServiceWorkerRegistrationEnabled,
} from '@/services/serviceWorkerRegistration'
import type {
  BrowserNotificationPermissionState,
  PushBrowserState,
  PushPreferencesState,
  PushServiceWorkerMessage,
  PushSubscriptionPayload,
  PushSupportState,
  PushSyncResult,
} from '@/types/pushNotifications'

const PUSH_SYNC_FINGERPRINT_KEY = 'flynance:push:last-synced-fingerprint'
const PUSH_SYNC_DIRTY_KEY = 'flynance:push:dirty'
const PUSH_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function isBrowser() {
  return typeof window !== 'undefined'
}

function debugPush(message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'production') return
  if (meta === undefined) {
    console.debug(`[push] ${message}`)
    return
  }
  console.debug(`[push] ${message}`, meta)
}

function isStandaloneMode() {
  if (!isBrowser()) return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  return Boolean(mediaStandalone || iosStandalone)
}

export function getPushSupportState(): PushSupportState {
  const hasNotificationSupport = isBrowser() && typeof Notification !== 'undefined'
  const hasServiceWorkerSupport =
    isBrowser() && 'serviceWorker' in navigator && isServiceWorkerRegistrationEnabled()
  const hasPushManagerSupport = isBrowser() && 'PushManager' in window

  return {
    isSupported: hasNotificationSupport && hasServiceWorkerSupport && hasPushManagerSupport,
    hasNotificationSupport,
    hasServiceWorkerSupport,
    hasPushManagerSupport,
    isStandalone: isStandaloneMode(),
  }
}

export function getBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (!isBrowser() || typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

function buildEmptyPushResult(reason: string): PushSyncResult {
  return {
    support: getPushSupportState(),
    permission: getBrowserNotificationPermission(),
    subscription: null,
    hasActiveSubscription: false,
    didSubscribe: false,
    didUnsubscribe: false,
    didSync: false,
    reason,
  }
}

function getStoredSyncFingerprint() {
  if (!isBrowser()) return ''

  try {
    return window.localStorage.getItem(PUSH_SYNC_FINGERPRINT_KEY) ?? ''
  } catch {
    return ''
  }
}

function setStoredSyncFingerprint(fingerprint: string) {
  if (!isBrowser()) return

  try {
    if (!fingerprint) {
      window.localStorage.removeItem(PUSH_SYNC_FINGERPRINT_KEY)
      return
    }

    window.localStorage.setItem(PUSH_SYNC_FINGERPRINT_KEY, fingerprint)
  } catch {
    // noop
  }
}

export function markPushSubscriptionDirty(reason = 'unknown') {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(PUSH_SYNC_DIRTY_KEY, reason)
  } catch {
    // noop
  }
}

export function clearPushSubscriptionDirty() {
  if (!isBrowser()) return

  try {
    window.localStorage.removeItem(PUSH_SYNC_DIRTY_KEY)
  } catch {
    // noop
  }
}

function hasPendingPushSync() {
  if (!isBrowser()) return false

  try {
    return Boolean(window.localStorage.getItem(PUSH_SYNC_DIRTY_KEY))
  } catch {
    return false
  }
}

function urlBase64ToUint8Array(base64Value: string) {
  const padding = '='.repeat((4 - (base64Value.length % 4)) % 4)
  const normalized = `${base64Value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(normalized)
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0))
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return ''

  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return window.btoa(binary)
}

export function serializePushSubscription(
  subscription: Pick<PushSubscription, 'endpoint' | 'expirationTime' | 'getKey'>
): PushSubscriptionPayload {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth')),
    },
  }
}

export function buildPushSubscriptionFingerprint(subscription: PushSubscriptionPayload | null) {
  return subscription ? JSON.stringify(subscription) : ''
}

function isPushSubscriptionExpired(subscription: PushSubscription) {
  if (subscription.expirationTime == null) return false
  return subscription.expirationTime <= Date.now()
}

async function syncSubscriptionWithBackend(
  subscription: PushSubscriptionPayload,
  forceSync = false
) {
  const fingerprint = buildPushSubscriptionFingerprint(subscription)
  const isAlreadySynced = fingerprint === getStoredSyncFingerprint()

  if (!forceSync && isAlreadySynced && !hasPendingPushSync()) {
    debugPush('Subscription ja sincronizada, evitando POST duplicado.', subscription.endpoint)
    return false
  }

  await createPushSubscription(subscription)
  setStoredSyncFingerprint(fingerprint)
  clearPushSubscriptionDirty()
  return true
}

async function buildPushBrowserState(): Promise<PushBrowserState> {
  const support = getPushSupportState()

  if (!support.isSupported) {
    return {
      support,
      permission: getBrowserNotificationPermission(),
      subscription: null,
      hasActiveSubscription: false,
    }
  }

  const registration = await getReadyServiceWorkerRegistration()
  if (!registration) {
    return {
      support,
      permission: getBrowserNotificationPermission(),
      subscription: null,
      hasActiveSubscription: false,
    }
  }

  const currentSubscription = await registration.pushManager.getSubscription()
  const serializedSubscription = currentSubscription
    ? serializePushSubscription(currentSubscription)
    : null

  return {
    support,
    permission: getBrowserNotificationPermission(),
    subscription: serializedSubscription,
    hasActiveSubscription: Boolean(serializedSubscription),
  }
}

async function ensurePushSubscription(options?: {
  forceBackendSync?: boolean
  forceResubscribe?: boolean
}): Promise<PushSyncResult> {
  const support = getPushSupportState()
  if (!support.isSupported) {
    return buildEmptyPushResult('unsupported')
  }

  const permission = getBrowserNotificationPermission()
  if (permission !== 'granted') {
    const state = await buildPushBrowserState()
    return {
      ...state,
      didSubscribe: false,
      didUnsubscribe: false,
      didSync: false,
      reason: `permission:${permission}`,
    }
  }

  if (!PUSH_PUBLIC_KEY.trim()) {
    throw new Error(
      'Defina NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ou NEXT_PUBLIC_VAPID_PUBLIC_KEY para ativar Web Push.'
    )
  }

  const registration = await getReadyServiceWorkerRegistration()
  if (!registration) {
    throw new Error('Service Worker nao esta pronto para registrar notificacoes push.')
  }

  let currentSubscription = await registration.pushManager.getSubscription()
  let didUnsubscribe = false
  let previousEndpoint: string | null = null

  if (
    currentSubscription &&
    (options?.forceResubscribe || isPushSubscriptionExpired(currentSubscription))
  ) {
    previousEndpoint = currentSubscription.endpoint
    await currentSubscription.unsubscribe()
    currentSubscription = null
    didUnsubscribe = true
    markPushSubscriptionDirty('resubscribe')
  }

  let didSubscribe = false

  if (!currentSubscription) {
    currentSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY),
    })
    didSubscribe = true
  }

  const serializedSubscription = serializePushSubscription(currentSubscription)

  if (previousEndpoint && previousEndpoint !== serializedSubscription.endpoint) {
    try {
      await deletePushSubscription({ endpoint: previousEndpoint })
    } catch (error: unknown) {
      debugPush('Falha ao remover endpoint antigo apos resubscribe.', error)
    }
  }

  const didSync = await syncSubscriptionWithBackend(
    serializedSubscription,
    Boolean(options?.forceBackendSync || didSubscribe || didUnsubscribe)
  )

  return {
    support,
    permission,
    subscription: serializedSubscription,
    hasActiveSubscription: true,
    didSubscribe,
    didUnsubscribe,
    didSync,
    reason: didSubscribe ? 'subscribed' : 'already-subscribed',
  }
}

export async function getPushBrowserState() {
  return buildPushBrowserState()
}

export async function requestBrowserNotificationPermission() {
  if (!isBrowser() || typeof Notification === 'undefined') return 'unsupported' as const
  return Notification.requestPermission()
}

export async function activatePushNotifications(): Promise<PushSyncResult> {
  const currentPermission = getBrowserNotificationPermission()

  if (currentPermission === 'default') {
    const requestedPermission = await requestBrowserNotificationPermission()
    if (requestedPermission !== 'granted') {
      const state = await buildPushBrowserState()
      return {
        ...state,
        didSubscribe: false,
        didUnsubscribe: false,
        didSync: false,
        reason: `permission:${requestedPermission}`,
      }
    }
  }

  return ensurePushSubscription({ forceBackendSync: true })
}

export async function unsubscribePushNotifications(): Promise<PushSyncResult> {
  const support = getPushSupportState()
  if (!support.isSupported) {
    return buildEmptyPushResult('unsupported')
  }

  const registration = await getReadyServiceWorkerRegistration()
  if (!registration) {
    return buildEmptyPushResult('service-worker-unavailable')
  }

  const currentSubscription = await registration.pushManager.getSubscription()
  if (!currentSubscription) {
    setStoredSyncFingerprint('')
    clearPushSubscriptionDirty()

    return {
      support,
      permission: getBrowserNotificationPermission(),
      subscription: null,
      hasActiveSubscription: false,
      didSubscribe: false,
      didUnsubscribe: false,
      didSync: false,
      reason: 'already-unsubscribed',
    }
  }

  const serializedSubscription = serializePushSubscription(currentSubscription)

  await currentSubscription.unsubscribe()
  await deletePushSubscription({ endpoint: serializedSubscription.endpoint })

  setStoredSyncFingerprint('')
  clearPushSubscriptionDirty()

  return {
    support,
    permission: getBrowserNotificationPermission(),
    subscription: null,
    hasActiveSubscription: false,
    didSubscribe: false,
    didUnsubscribe: true,
    didSync: true,
    reason: 'unsubscribed',
  }
}

export async function syncPushSubscriptionWithPreferences(
  preferences: PushPreferencesState,
  options?: {
    forceBackendSync?: boolean
  }
): Promise<PushSyncResult> {
  if (!preferences.notificationsEnabled || !preferences.notificationPush) {
    return unsubscribePushNotifications()
  }

  const permission = getBrowserNotificationPermission()
  if (permission !== 'granted') {
    const state = await buildPushBrowserState()
    return {
      ...state,
      didSubscribe: false,
      didUnsubscribe: false,
      didSync: false,
      reason: permission === 'denied' ? 'permission-denied' : 'permission-pending',
    }
  }

  return ensurePushSubscription({
    forceBackendSync: Boolean(options?.forceBackendSync || hasPendingPushSync()),
  })
}

export function handlePushServiceWorkerMessage(message: PushServiceWorkerMessage) {
  if (message.type !== 'PUSH_SUBSCRIPTION_DIRTY') return

  markPushSubscriptionDirty(
    message.previousEndpoint ? `worker:${message.previousEndpoint}` : 'worker'
  )
}
