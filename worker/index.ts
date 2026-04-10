/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & {
    __WB_DISABLE_DEV_LOGS?: boolean
  }

type PushNotificationPayload = {
  title?: string
  body?: string
  url?: string
  tag?: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
}

type PushServiceWorkerMessage =
  | {
      type: 'PUSH_SUBSCRIPTION_DIRTY'
      previousEndpoint?: string | null
    }
  | {
      type: 'PUSH_NOTIFICATION_CLICKED'
      url?: string | null
    }

const DEFAULT_NOTIFICATION_TITLE = 'Flynance'
const DEFAULT_NOTIFICATION_URL = '/dashboard'
const DEFAULT_NOTIFICATION_ICON = '/icons/icon-192.png'
const DEFAULT_NOTIFICATION_BADGE = '/icons/badge-72.png'
const PUSH_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

self.__WB_DISABLE_DEV_LOGS = true

function debugPushWorker(message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'production') return
  if (meta === undefined) {
    console.debug(`[push-sw] ${message}`)
    return
  }
  console.debug(`[push-sw] ${message}`, meta)
}

function urlBase64ToUint8Array(base64Value: string) {
  const padding = '='.repeat((4 - (base64Value.length % 4)) % 4)
  const normalized = `${base64Value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(normalized)
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0))
}

function resolveNotificationUrl(url?: string) {
  const targetUrl = typeof url === 'string' && url.trim() ? url.trim() : DEFAULT_NOTIFICATION_URL
  return new URL(targetUrl, self.location.origin).toString()
}

function normalizePushPayload(rawPayload: unknown): PushNotificationPayload {
  if (!rawPayload || typeof rawPayload !== 'object') return {}

  const payload = rawPayload as Record<string, unknown>
  return {
    title: typeof payload.title === 'string' ? payload.title : undefined,
    body: typeof payload.body === 'string' ? payload.body : undefined,
    url: typeof payload.url === 'string' ? payload.url : undefined,
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    icon: typeof payload.icon === 'string' ? payload.icon : undefined,
    badge: typeof payload.badge === 'string' ? payload.badge : undefined,
    data:
      payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : undefined,
  }
}

function parsePushPayload(event: PushEvent): PushNotificationPayload {
  if (!event.data) return {}

  try {
    return normalizePushPayload(event.data.json())
  } catch {
    return normalizePushPayload({ body: event.data.text() })
  }
}

function createNotificationOptions(payload: PushNotificationPayload): NotificationOptions {
  return {
    body: payload.body,
    tag: payload.tag,
    icon: payload.icon || DEFAULT_NOTIFICATION_ICON,
    badge: payload.badge || DEFAULT_NOTIFICATION_BADGE,
    data: {
      ...(payload.data ?? {}),
      url: payload.url || DEFAULT_NOTIFICATION_URL,
    },
  }
}

async function broadcastMessage(message: PushServiceWorkerMessage) {
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  allClients.forEach((client) => {
    client.postMessage(message)
  })
}

async function focusOrOpenNotificationTarget(url: string) {
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  const targetUrl = new URL(url)
  const targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`

  const exactClientMatch = allClients.find((client) => {
    try {
      const clientUrl = new URL(client.url)
      return (
        clientUrl.origin === targetUrl.origin &&
        `${clientUrl.pathname}${clientUrl.search}${clientUrl.hash}` === targetPath
      )
    } catch {
      return false
    }
  })

  if (exactClientMatch && 'focus' in exactClientMatch) {
    await exactClientMatch.focus()
    return
  }

  const sameOriginClient = allClients.find((client) => {
    try {
      return new URL(client.url).origin === targetUrl.origin
    } catch {
      return false
    }
  })

  if (sameOriginClient && 'focus' in sameOriginClient) {
    const focusedClient = await sameOriginClient.focus()
    if (focusedClient && 'navigate' in focusedClient) {
      await focusedClient.navigate(url)
    }
    return
  }

  await self.clients.openWindow(url)
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)
  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : DEFAULT_NOTIFICATION_TITLE

  event.waitUntil(self.registration.showNotification(title, createNotificationOptions(payload)))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = (event.notification.data ?? {}) as Record<string, unknown>
  const url = typeof data.url === 'string' ? data.url : DEFAULT_NOTIFICATION_URL
  const absoluteUrl = resolveNotificationUrl(url)

  event.waitUntil(
    (async () => {
      await focusOrOpenNotificationTarget(absoluteUrl)
      await broadcastMessage({ type: 'PUSH_NOTIFICATION_CLICKED', url })
    })()
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const previousEndpoint = event.oldSubscription?.endpoint ?? null

      if (!PUSH_PUBLIC_KEY.trim()) {
        debugPushWorker('Resubscribe ignorado porque nao existe VAPID public key configurada.')
        await broadcastMessage({ type: 'PUSH_SUBSCRIPTION_DIRTY', previousEndpoint })
        return
      }

      try {
        await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY),
        })
        debugPushWorker('Push subscription renovada pelo service worker.')
      } catch (error: unknown) {
        debugPushWorker('Falha ao renovar push subscription no service worker.', error)
      }

      await broadcastMessage({ type: 'PUSH_SUBSCRIPTION_DIRTY', previousEndpoint })
    })()
  )
})

export {}
