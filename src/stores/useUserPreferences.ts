import { create } from 'zustand'
import type { UserPreferences, UserPreferencesPatch } from '@/types/userPreferences'

type UserPreferencesStore = {
  preferences: UserPreferences | null
  setPreferences: (preferences: UserPreferences | null) => void
  mergePreferences: (patch: UserPreferencesPatch) => void
  clearPreferences: () => void
}

export const useUserPreferencesStore = create<UserPreferencesStore>((set) => ({
  preferences: null,
  setPreferences: (preferences) => set({ preferences }),
  mergePreferences: (patch) =>
    set((state) => ({
      preferences: state.preferences
        ? {
            ...state.preferences,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : state.preferences,
    })),
  clearPreferences: () => set({ preferences: null }),
}))
