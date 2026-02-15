// stores/useUserSession.ts
import api from '@/lib/axios'
import { SessionResponse } from '@/types/Transaction'
import { create } from 'zustand'
import { useAdvisorActing } from './useAdvisorActing'
import axios from 'axios'

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
      set({ user: res.data, status: 'authenticated' })
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined

      if (status === 401 || status === 403) {
        clearAuthToken()
        useAdvisorActing.getState().clearActingClient()
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
    set({ user: null, status: 'unauthenticated' })
    localStorage.clear()
  },

  setUser: (user) => set({ user, status: 'authenticated' }),

  clearUser: () => {
    clearAuthToken()
    useAdvisorActing.getState().clearActingClient()
    set({ user: null, status: 'unauthenticated' })
  },
}))
