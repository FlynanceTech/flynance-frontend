import type { PushServiceWorkerMessage } from '@/types/pushNotifications'

export const APP_SERVICE_WORKER_PATH = '/sw.js'
export const APP_SERVICE_WORKER_SCOPE = '/'

let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

function isBrowser() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

function debugServiceWorker(message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'production') return
  if (meta === undefined) {
    console.debug(`[sw] ${message}`)
    return
  }
  console.debug(`[sw] ${message}`, meta)
}

export function isServiceWorkerRegistrationEnabled() {
  if (!isBrowser()) return false
  if (process.env.NODE_ENV === 'production') return true
  return process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === 'true'
}

export function isServiceWorkerSupported() {
  return isBrowser() && 'serviceWorker' in navigator
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    debugServiceWorker('Service Worker nao suportado neste navegador.')
    return null
  }

  if (!isServiceWorkerRegistrationEnabled()) {
    debugServiceWorker('Registro de Service Worker desativado neste ambiente.')
    return null
  }

  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = (async () => {
      const existingRegistration = await navigator.serviceWorker.getRegistration(
        APP_SERVICE_WORKER_SCOPE
      )

      if (existingRegistration) {
        debugServiceWorker('Reutilizando Service Worker existente.', existingRegistration.scope)
        return existingRegistration
      }

      const registration = await navigator.serviceWorker.register(APP_SERVICE_WORKER_PATH, {
        scope: APP_SERVICE_WORKER_SCOPE,
      })

      debugServiceWorker('Service Worker registrado.', registration.scope)
      return registration
    })().catch((error: unknown) => {
      serviceWorkerRegistrationPromise = null
      debugServiceWorker('Falha ao registrar Service Worker.', error)
      throw error
    })
  }

  return serviceWorkerRegistrationPromise
}

export async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) return null
  if (!isServiceWorkerRegistrationEnabled()) return null

  await registerAppServiceWorker()
  return navigator.serviceWorker.ready
}

function isPushServiceWorkerMessage(data: unknown): data is PushServiceWorkerMessage {
  if (!data || typeof data !== 'object') return false

  const message = data as Record<string, unknown>
  return (
    message.type === 'PUSH_SUBSCRIPTION_DIRTY' || message.type === 'PUSH_NOTIFICATION_CLICKED'
  )
}

export function addAppServiceWorkerMessageListener(
  listener: (message: PushServiceWorkerMessage, event: MessageEvent<unknown>) => void
) {
  if (!isServiceWorkerSupported()) return () => undefined

  const onMessage = (event: MessageEvent<unknown>) => {
    if (!isPushServiceWorkerMessage(event.data)) return
    listener(event.data, event)
  }

  navigator.serviceWorker.addEventListener('message', onMessage)

  return () => {
    navigator.serviceWorker.removeEventListener('message', onMessage)
  }
}
