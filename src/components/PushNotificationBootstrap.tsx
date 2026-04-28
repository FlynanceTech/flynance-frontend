'use client'

import { useEffect } from 'react'
import {
  handlePushServiceWorkerMessage,
  syncPushSubscriptionWithPreferences,
} from '@/services/pushNotificationService'
import {
  addAppServiceWorkerMessageListener,
  registerAppServiceWorker,
} from '@/services/serviceWorkerRegistration'
import { useUserSession } from '@/stores/useUserSession'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'

function syncCurrentPushPreferences(forceBackendSync = false) {
  const currentPreferences = useUserPreferencesStore.getState().preferences
  if (!currentPreferences) return

  void syncPushSubscriptionWithPreferences(
    {
      notificationsEnabled: currentPreferences.notificationsEnabled,
      notificationPush: currentPreferences.notificationPush,
    },
    { forceBackendSync }
  ).catch(() => undefined)
}

export default function PushNotificationBootstrap() {
  const status = useUserSession((state) => state.status)
  const preferences = useUserPreferencesStore((state) => state.preferences)

  useEffect(() => {
    void registerAppServiceWorker().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || !preferences) return

    syncCurrentPushPreferences()
  }, [status, preferences])

  useEffect(() => {
    if (status !== 'authenticated') return

    const onFocus = () => {
      syncCurrentPushPreferences(true)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      syncCurrentPushPreferences(true)
    }

    const unsubscribeMessages = addAppServiceWorkerMessageListener((message) => {
      handlePushServiceWorkerMessage(message)
      syncCurrentPushPreferences(true)
    })

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      unsubscribeMessages()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [status])

  return null
}
