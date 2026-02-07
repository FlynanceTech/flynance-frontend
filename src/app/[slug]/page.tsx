'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseOriginFromUrl, saveOriginAttribution } from '@/utils/originAttribution'

export default function SlugCapturePage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const parsed = parseOriginFromUrl(pathname ?? '', new URLSearchParams(searchParams.toString()))
    if (parsed.hasUrlHint) {
      saveOriginAttribution(parsed.origin, parsed.originRef)
    }
    router.replace('/')
  }, [pathname, searchParams, router])

  return null
}
