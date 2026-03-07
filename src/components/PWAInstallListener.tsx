'use client'

import { useEffect } from 'react'
import { updateUserAppPreferences } from '@/services/userAppPreferences'
import { useUserSession } from '@/stores/useUserSession'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'

const PWA_PENDING_SYNC_KEY = 'flynance:pwa-installed:pending-sync'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean((window.navigator as any)?.standalone)
  return Boolean(mediaStandalone || iosStandalone)
}

export default function PWAInstallListener() {
  useEffect(() => {
    let syncing = false

    const markPendingSync = () => {
      try {
        window.localStorage.setItem(PWA_PENDING_SYNC_KEY, '1')
      } catch {
        // noop
      }
    }

    const clearPendingSync = () => {
      try {
        window.localStorage.removeItem(PWA_PENDING_SYNC_KEY)
      } catch {
        // noop
      }
    }

    const hasPendingSync = () => {
      try {
        return window.localStorage.getItem(PWA_PENDING_SYNC_KEY) === '1'
      } catch {
        return false
      }
    }

    const syncInstalledStatus = async () => {
      if (syncing) return
      if (!hasPendingSync()) return

      const { status } = useUserSession.getState()
      const currentPreferences = useUserPreferencesStore.getState().preferences

      if (status !== 'authenticated') return
      if (currentPreferences?.pwaInstalled) {
        clearPendingSync()
        return
      }

      syncing = true
      try {
        const nextPreferences = await updateUserAppPreferences({
          pwaInstalled: true,
          pwaInstalledAt: new Date().toISOString(),
        })
        useUserPreferencesStore.getState().setPreferences(nextPreferences)
        clearPendingSync()
      } catch {
        // mantem flag para tentar novamente depois
      } finally {
        syncing = false
      }
    }

    if (isStandaloneMode()) {
      markPendingSync()
    }
    void syncInstalledStatus()

    const onAppInstalled = () => {
      markPendingSync()
      void syncInstalledStatus()
    }

    const onFocus = () => {
      void syncInstalledStatus()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncInstalledStatus()
      }
    }

    const unsubscribeSession = useUserSession.subscribe((state, prevState) => {
      if (state.status === 'authenticated' && prevState.status !== 'authenticated') {
        void syncInstalledStatus()
      }
    })

    window.addEventListener('appinstalled', onAppInstalled)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      unsubscribeSession()
      window.removeEventListener('appinstalled', onAppInstalled)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return null
}
