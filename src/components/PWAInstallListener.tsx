'use client'

import { useEffect } from 'react'

export default function PWAInstallListener() {
  useEffect(() => {
    const onAppInstalled = () => {
      // aqui você pode exibir um modal/toast/mensagem na interface
      alert('App instalado! 🎉')
    }

    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  return null
}
