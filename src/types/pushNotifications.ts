import type { UserPreferences, UserPreferencesPatch } from '@/types/userPreferences'

export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported'

export type PushSubscriptionKeys = {
  p256dh: string
  auth: string
}

export type PushSubscriptionPayload = {
  endpoint: string
  expirationTime: number | null
  keys: PushSubscriptionKeys
}

export type PushSubscriptionDeletePayload = {
  endpoint: string
}

export type PushNotificationPayload = {
  title?: string
  body?: string
  url?: string
  tag?: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
}

export type PushSupportState = {
  isSupported: boolean
  hasNotificationSupport: boolean
  hasServiceWorkerSupport: boolean
  hasPushManagerSupport: boolean
  isStandalone: boolean
}

export type PushBrowserState = {
  support: PushSupportState
  permission: BrowserNotificationPermissionState
  subscription: PushSubscriptionPayload | null
  hasActiveSubscription: boolean
}

export type PushSyncResult = PushBrowserState & {
  didSubscribe: boolean
  didUnsubscribe: boolean
  didSync: boolean
  reason: string
}

export type PushPreferencesState = Pick<UserPreferences, 'notificationsEnabled' | 'notificationPush'>

export type PushUserPreferencesPatch = UserPreferencesPatch

export type PushApiMutationResult = {
  mocked: boolean
}

export type PushServiceWorkerMessage =
  | {
      type: 'PUSH_SUBSCRIPTION_DIRTY'
      previousEndpoint?: string | null
    }
  | {
      type: 'PUSH_NOTIFICATION_CLICKED'
      url?: string | null
    }
