'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserSession } from '@/stores/useUserSession'
import { canAccessAdvisorRole, isOrgAdminRole } from '@/utils/roles'

const PUBLIC_ADVISOR_PATHS = [
  '/advisor/login',
  '/advisor/client-invite',
  '/advisor/invite',
]

export default function AdvisorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, status, fetchAccount } = useUserSession()

  const isPublicPath = PUBLIC_ADVISOR_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (status === 'idle') {
      fetchAccount()
    }
  }, [status, fetchAccount])

  const role = user?.userData?.user?.role
  const canAccessAdvisor = canAccessAdvisorRole(role)

  useEffect(() => {
    if (isPublicPath) return
    if (status === 'idle' || status === 'loading') return

    if (status === 'unauthenticated') {
      router.replace(`/advisor/login?next=${encodeURIComponent(pathname || '/advisor')}`)
      return
    }

    if (!canAccessAdvisor) {
      router.replace('/dashboard')
      return
    }

    // Non-org advisor trying to access /advisor/organization → redirect to /advisor
    if (!isOrgAdminRole(role) && pathname.startsWith('/advisor/organization')) {
      router.replace('/advisor')
    }
  }, [status, canAccessAdvisor, pathname, router, isPublicPath, role])

  if (isPublicPath) return <>{children}</>

  const redirectPending = !isOrgAdminRole(role) && pathname.startsWith('/advisor/organization')

  if (status === 'idle' || status === 'loading' || status === 'unauthenticated' || !canAccessAdvisor || redirectPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F98C2]" />
        <p className="mt-3 text-sm text-slate-500">Validando acesso ao Fly Advisory...</p>
      </div>
    )
  }

  return <>{children}</>
}
