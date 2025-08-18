// stores/useUserSession.ts
import api from '@/lib/axios'
import { SessionResponse } from '@/types/Transaction'
import { create } from 'zustand'


type UserSessionStore = {
  user: SessionResponse | null
  loading: boolean
  fetchAccount: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: SessionResponse) => void
  clearUser: () => void
}

export const useUserSession = create<UserSessionStore>((set) => ({
  user: null,
  loading: true,

  fetchAccount: async () => {
    try {
      const res = await api.get('/auth/me', { withCredentials: true })
      set({ user: res.data, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  logout: async () => {
    await api.post('/auth/logout', {}, { withCredentials: true })
    set({ user: null })
    localStorage.clear()
  },
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
