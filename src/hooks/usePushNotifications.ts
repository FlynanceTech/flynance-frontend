'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  activatePushNotifications,
  getPushBrowserState,
  handlePushServiceWorkerMessage,
  syncPushSubscriptionWithPreferences,
} from '@/services/pushNotificationService'
import { addAppServiceWorkerMessageListener } from '@/services/serviceWorkerRegistration'
import type {
  PushBrowserState,
  PushPreferencesState,
  PushSyncResult,
} from '@/types/pushNotifications'
import { getErrorMessage } from '@/utils/getErrorMessage'

const EMPTY_PUSH_STATE: PushBrowserState = {
  support: {
    isSupported: false,
    hasNotificationSupport: false,
    hasServiceWorkerSupport: false,
    hasPushManagerSupport: false,
    isStandalone: false,
  },
  permission: 'unsupported',
  subscription: null,
  hasActiveSubscription: false,
}

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
type PushAction = 'idle' | 'refresh' | 'activate' | 'sync'

export function usePushNotifications() {
  const [state, setState] = useState<PushBrowserState>(EMPTY_PUSH_STATE)
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<PushSyncResult | null>(null)
  const [currentAction, setCurrentAction] = useState<PushAction>('idle')

  const applyResult = useCallback((result: PushBrowserState | PushSyncResult) => {
    setState({
      support: result.support,
      permission: result.permission,
      subscription: result.subscription,
      hasActiveSubscription: result.hasActiveSubscription,
    })

    if ('reason' in result) {
      setLastResult(result)
    }

    return result
  }, [])

  const run = useCallback(
    async <T extends PushBrowserState | PushSyncResult>(
      actionName: PushAction,
      action: () => Promise<T>
    ) => {
      setStatus('loading')
      setError(null)
      setCurrentAction(actionName)

      try {
        const result = await action()
        applyResult(result)
        setStatus('success')
        setCurrentAction('idle')
        return result
      } catch (nextError: unknown) {
        setStatus('error')
        setCurrentAction('idle')
        setError(
          getErrorMessage(
            nextError,
            'Nao foi possivel atualizar o estado das notificacoes do navegador.'
          )
        )
        throw nextError
      }
    },
    [applyResult]
  )

  const refresh = useCallback(async () => run('refresh', () => getPushBrowserState()), [run])

  const activate = useCallback(
    async () => run('activate', () => activatePushNotifications()),
    [run]
  )

  const syncWithPreferences = useCallback(async (
    preferences: PushPreferencesState,
    options?: {
      forceBackendSync?: boolean
    }
  ) => run('sync', () => syncPushSubscriptionWithPreferences(preferences, options)), [run])
  const refreshRef = useRef(refresh)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshRef.current().catch(() => undefined)
    }, 0)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onFocus = () => {
      void refreshRef.current().catch(() => undefined)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void refreshRef.current().catch(() => undefined)
    }

    const unsubscribeMessages = addAppServiceWorkerMessageListener((message) => {
      handlePushServiceWorkerMessage(message)
      void refreshRef.current().catch(() => undefined)
    })

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      unsubscribeMessages()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return {
    ...state,
    status,
    currentAction,
    error,
    lastResult,
    refresh,
    activate,
    syncWithPreferences,
  }
}
