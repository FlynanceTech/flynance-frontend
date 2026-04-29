'use client'

import { useEffect } from 'react'
import { registerAppServiceWorker } from '@/services/serviceWorkerRegistration'

export default function PWARegister() {
  useEffect(() => {
    void registerAppServiceWorker().catch(() => undefined)
  }, [])

  return null
}
