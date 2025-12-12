// stores/useUserSession.ts
import api from '@/lib/axios'
import { SessionResponse } from '@/types/Transaction'
import { create } from 'zustand'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type UserSessionStore = {
  user: SessionResponse | null
  status: AuthStatus
  fetchAccount: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: SessionResponse) => void
  clearUser: () => void
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
    } catch {
      set({ user: null, status: 'unauthenticated' })
    }
  },

  logout: async () => {
    await api.post('/auth/logout', {}, { withCredentials: true })
    set({ user: null, status: 'unauthenticated' })
    localStorage.clear()
  },

  setUser: (user) => set({ user, status: 'authenticated' }),

  clearUser: () => set({ user: null, status: 'unauthenticated' }),
}))
