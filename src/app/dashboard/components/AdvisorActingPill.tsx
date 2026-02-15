'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUserSession } from '@/stores/useUserSession'
import { useAdvisorActing } from '@/stores/useAdvisorActing'
import { isAdvisorRole } from '@/utils/roles'

export default function AdvisorActingPill() {
  const router = useRouter()
  const { user } = useUserSession()
  const role = user?.userData?.user?.role
  const isAdvisor = isAdvisorRole(role)

  const activeClientId = useAdvisorActing((s) => s.activeClientId ?? s.selectedClientId)
  const activeClientName = useAdvisorActing((s) => s.activeClientName ?? s.selectedClientName)
  const activeClientEmail = useAdvisorActing((s) => s.activeClientEmail ?? s.selectedClientEmail)
  const clearActingClient = useAdvisorActing((s) => s.clearActingClient)

  const clientLabel = useMemo(() => {
    if (activeClientName?.trim()) return activeClientName.trim()
    if (activeClientEmail?.trim()) return activeClientEmail.trim()
    return activeClientId ?? ''
  }, [activeClientEmail, activeClientId, activeClientName])

  if (!isAdvisor || !activeClientId) return null

  return (
    <div className="fixed left-1/2 top-3 z-[70] w-[95%] max-w-[760px] -translate-x-1/2 rounded-xl border border-[#BFE0F5] bg-[#EEF8FF] px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium text-[#1E5F86] md:text-sm">
          Cliente ativo: <span className="font-semibold">{clientLabel}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            clearActingClient()
            router.push('/dashboard')
            router.refresh()
          }}
          className="whitespace-nowrap rounded-full border border-[#94C9E7] bg-white px-3 py-1 text-xs font-semibold text-[#1E5F86] hover:bg-[#F4FAFF]"
        >
          Sair do cliente
        </button>
      </div>
    </div>
  )
}
