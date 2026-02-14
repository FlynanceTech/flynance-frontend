'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUserSession } from '@/stores/useUserSession'
import { isAdminRole } from '@/utils/roles'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, status, fetchAccount } = useUserSession()

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const isAdmin = isAdminRole(user?.userData?.user?.role)

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      if (pathname !== '/login') router.replace('/login')
      return
    }

    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [status, isAdmin, pathname, router])

  if (status === 'idle' || status === 'loading' || status === 'unauthenticated' || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <div className="h-10 w-10 rounded-full border-4 border-[#4F98C2] border-t-transparent animate-spin" />
        <p className="mt-3 text-sm text-slate-600">Verificando acesso admin...</p>
      </div>
    )
  }

  return <>{children}</>
}
