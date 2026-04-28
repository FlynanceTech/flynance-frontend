'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const THEMED_PREFIXES = ['/dashboard', '/admin', '/advisor']

function isThemedRoute(pathname: string): boolean {
  return THEMED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export default function ThemeScopeController() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const currentPath = String(pathname ?? '')
    if (isThemedRoute(currentPath)) return

    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.removeAttribute('data-theme')
    html.style.removeProperty('color-scheme')
  }, [pathname])

  return null
}
