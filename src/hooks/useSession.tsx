'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserSession } from '@/stores/useUserSession'

export function useSession() {
  const { user, loading, fetchAccount, clearUser } = useUserSession()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      clearUser()
      router.push('/login')
      return
    }

    fetchAccount().catch(() => {
      clearUser()
      localStorage.removeItem('token')
      router.push('/login')
    })
  }, [fetchAccount, clearUser, router])

  return { loading, user }
}
