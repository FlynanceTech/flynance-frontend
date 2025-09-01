'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('✅ Service Worker registrado:', reg))
        .catch(err => console.error('❌ Falha ao registrar SW:', err));
    }
  }, []);

  return null;
}
