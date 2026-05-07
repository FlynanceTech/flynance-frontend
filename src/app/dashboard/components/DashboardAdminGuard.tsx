'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useUserSession } from '@/stores/useUserSession'
import { isAdminRole } from '@/utils/roles'

export default function DashboardAdminGuard({ children }: { children: React.ReactNode }) {
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
      router.replace('/login')
      return
    }

    if (!isAdmin) {
      router.replace('/dashboard')
    }
  }, [status, isAdmin, pathname, router])

  if (status === 'idle' || status === 'loading' || status === 'unauthenticated' || !isAdmin) {
    return (
      <section className="flex min-h-[70vh] w-full items-center justify-center px-4 py-10">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#4F98C2] border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600 dark:text-zinc-300">
            Verificando acesso administrativo...
          </p>
        </div>
      </section>
    )
  }

  return <>{children}</>
}
