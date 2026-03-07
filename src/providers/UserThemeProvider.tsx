'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from 'next-themes'
import { getErrorMessage } from '@/utils/getErrorMessage'
import { getUserAppPreferences, updateUserAppPreferences } from '@/services/userAppPreferences'
import { useUserPreferencesStore } from '@/stores/useUserPreferences'
import { useUserSession } from '@/stores/useUserSession'
import type { UserTheme } from '@/types/userPreferences'

type UserThemeContextValue = {
  theme: UserTheme
  setTheme: (theme: UserTheme) => void
  saveTheme: (theme: UserTheme) => Promise<void>
  isSavingTheme: boolean
  isThemeReady: boolean
}

const UserThemeContext = createContext<UserThemeContextValue | null>(null)

function normalizeUserTheme(value: unknown): UserTheme {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'DARK') return 'DARK'
  return 'LIGHT'
}

function toCssTheme(theme: UserTheme): 'light' | 'dark' {
  return theme === 'DARK' ? 'dark' : 'light'
}

export function UserThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme()
  const { status, user } = useUserSession()
  const preferencesTheme = useUserPreferencesStore((s) => s.preferences?.theme)
  const mergePreferences = useUserPreferencesStore((s) => s.mergePreferences)
  const setPreferences = useUserPreferencesStore((s) => s.setPreferences)

  const [theme, setThemeState] = useState<UserTheme>('LIGHT')
  const [isSavingTheme, setIsSavingTheme] = useState(false)
  const [isThemeReady, setIsThemeReady] = useState(false)
  const loadedForUserIdRef = useRef<string>('')
  const currentUserId = String(user?.userData?.user?.id ?? '').trim()

  const applyTheme = useCallback(
    (next: UserTheme) => {
      const normalized = normalizeUserTheme(next)
      const cssTheme = toCssTheme(normalized)
      setThemeState(normalized)
      setNextTheme(cssTheme)
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', cssTheme)
      }
    },
    [setNextTheme]
  )

  useEffect(() => {
    if (status !== 'authenticated') {
      loadedForUserIdRef.current = ''
    }
  }, [status])

  useEffect(() => {
    const next = normalizeUserTheme(preferencesTheme)
    applyTheme(next)
    setIsThemeReady(true)
  }, [preferencesTheme, applyTheme])

  useEffect(() => {
    if (status !== 'authenticated' || !currentUserId) return
    if (loadedForUserIdRef.current === currentUserId) return
    loadedForUserIdRef.current = currentUserId

    let cancelled = false

    ;(async () => {
      try {
        const loadedPreferences = await getUserAppPreferences()
        if (cancelled) return
        setPreferences(loadedPreferences)
        applyTheme(normalizeUserTheme(loadedPreferences.theme))
      } catch {
        if (cancelled) return
        applyTheme('LIGHT')
      } finally {
        if (!cancelled) setIsThemeReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, currentUserId, setPreferences, applyTheme])

  useEffect(() => {
    const normalizedNextTheme = normalizeUserTheme(
      nextTheme === 'dark' ? 'DARK' : 'LIGHT'
    )
    if (theme !== normalizedNextTheme) {
      setThemeState(normalizedNextTheme)
    }
  }, [nextTheme, theme])

  const setTheme = useCallback(
    (next: UserTheme) => {
      const normalized = normalizeUserTheme(next)
      applyTheme(normalized)
      mergePreferences({ theme: normalized })
    },
    [applyTheme, mergePreferences]
  )

  const saveTheme = useCallback(
    async (next: UserTheme) => {
      const normalized = normalizeUserTheme(next)
      const previous = normalizeUserTheme(theme)
      if (normalized === previous) return

      applyTheme(normalized)
      mergePreferences({ theme: normalized })
      setIsSavingTheme(true)

      try {
        const updated = await updateUserAppPreferences({ theme: normalized })
        setPreferences(updated)
        applyTheme(normalizeUserTheme(updated.theme))
      } catch (error) {
        applyTheme(previous)
        mergePreferences({ theme: previous })
        throw new Error(getErrorMessage(error, 'Nao foi possivel salvar o tema.'))
      } finally {
        setIsSavingTheme(false)
      }
    },
    [theme, applyTheme, mergePreferences, setPreferences]
  )

  const value = useMemo<UserThemeContextValue>(
    () => ({
      theme,
      setTheme,
      saveTheme,
      isSavingTheme,
      isThemeReady,
    }),
    [theme, setTheme, saveTheme, isSavingTheme, isThemeReady]
  )

  return <UserThemeContext.Provider value={value}>{children}</UserThemeContext.Provider>
}

export function useUserTheme() {
  const context = useContext(UserThemeContext)
  if (!context) {
    throw new Error('useUserTheme must be used within UserThemeProvider')
  }
  return context
}
