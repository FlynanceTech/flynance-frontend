// stores/useUserSession.ts
import api from '@/lib/axios'
import { SessionResponse } from '@/types/Transaction'
import { create } from 'zustand'
import { useAdvisorActing } from './useAdvisorActing'
import axios from 'axios'
import {
  extractPreferencesFromAuthMePayload,
  getUserAppPreferences,
} from '@/services/userAppPreferences'
import { useUserPreferencesStore } from './useUserPreferences'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type UserSessionStore = {
  user: SessionResponse | null
  status: AuthStatus
  fetchAccount: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: SessionResponse) => void
  clearUser: () => void
}

const clearAuthToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
}

export const useUserSession = create<UserSessionStore>((set) => ({
  user: null,
  status: 'idle', // ainda não buscamos nada

  fetchAccount: async () => {
    set({ status: 'loading' })

    try {
      const res = await api.get<SessionResponse>('/auth/me', {
        withCredentials: true,
      })
      const fallbackUserId = String((res.data as any)?.userData?.user?.id ?? '').trim()

      let resolvedPreferences =
        extractPreferencesFromAuthMePayload(res.data as unknown, fallbackUserId) ?? null

      try {
        // /users/me/preferences eh a fonte de verdade para garantir consistencia apos reload.
        resolvedPreferences = await getUserAppPreferences()
      } catch {
        // fallback para preferencias vindas de /auth/me quando a rota dedicada falhar.
      }

      if (resolvedPreferences) {
        useUserPreferencesStore.getState().setPreferences(resolvedPreferences)
      } else {
        useUserPreferencesStore.getState().clearPreferences()
      }

      set({
        user: resolvedPreferences ? ({ ...(res.data as any), preferences: resolvedPreferences } as SessionResponse) : res.data,
        status: 'authenticated',
      })
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined

      if (status === 401 || status === 403) {
        clearAuthToken()
        useAdvisorActing.getState().clearActingClient()
        useUserPreferencesStore.getState().clearPreferences()
        set({ user: null, status: 'unauthenticated' })
        return
      }

      set((state) => ({
        user: state.user,
        status: state.user ? 'authenticated' : 'unauthenticated',
      }))
    }
  },

  logout: async () => {
    await api.post('/auth/logout', {}, { withCredentials: true })
    useAdvisorActing.getState().clearActingClient()
    useUserPreferencesStore.getState().clearPreferences()
    set({ user: null, status: 'unauthenticated' })
    localStorage.clear()
  },

  setUser: (user) => {
    const fallbackUserId = String((user as any)?.userData?.user?.id ?? '').trim()
    const preferences =
      extractPreferencesFromAuthMePayload(user as unknown, fallbackUserId) ?? null
    if (preferences) {
      useUserPreferencesStore.getState().setPreferences(preferences)
    } else {
      useUserPreferencesStore.getState().clearPreferences()
    }
    set({ user, status: 'authenticated' })
  },

  clearUser: () => {
    clearAuthToken()
    useAdvisorActing.getState().clearActingClient()
    useUserPreferencesStore.getState().clearPreferences()
    set({ user: null, status: 'unauthenticated' })
  },
}))
