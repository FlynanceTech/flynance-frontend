import api from '@/lib/axios'
import { clearAuthSessionArtifacts, clearPersistedAuthToken } from '@/lib/authSession'
import {
  extractPreferencesFromAuthMePayload,
  getUserAppPreferences,
} from '@/services/userAppPreferences'
import { SessionResponse } from '@/types/Transaction'
import axios from 'axios'
import { create } from 'zustand'
import { useAdvisorActing } from './useAdvisorActing'
import { useUserPreferencesStore } from './useUserPreferences'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type UserSessionStore = {
  user: SessionResponse | null
  status: AuthStatus
  fetchAccount: () => Promise<void>
  logout: () => Promise<void>
  invalidateSession: () => Promise<void>
  setUser: (user: SessionResponse) => void
  clearUser: () => void
}

function applyUnauthenticatedState(set: (partial: Partial<UserSessionStore>) => void) {
  clearPersistedAuthToken()
  useAdvisorActing.getState().clearActingClient()
  useUserPreferencesStore.getState().clearPreferences()
  set({ user: null, status: 'unauthenticated' })
}

export const useUserSession = create<UserSessionStore>((set) => ({
  user: null,
  status: 'idle',

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
        user: resolvedPreferences
          ? ({ ...(res.data as any), preferences: resolvedPreferences } as SessionResponse)
          : res.data,
        status: 'authenticated',
      })
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined

      if (status === 401 || status === 403 || status === 404) {
        applyUnauthenticatedState(set)
        return
      }

      set((state) => ({
        user: state.user,
        status: state.user ? 'authenticated' : 'unauthenticated',
      }))
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true })
    } finally {
      applyUnauthenticatedState(set)
    }
  },

  invalidateSession: async () => {
    try {
      await clearAuthSessionArtifacts()
    } finally {
      applyUnauthenticatedState(set)
    }
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
    applyUnauthenticatedState(set)
  },
}))
