'use client'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Landmark, Tag, User,
  BookOpenCheck
} from 'lucide-react'
import React from 'react'

export default function BottomMenu() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Transações', icon: Landmark, path: '/dashboard/transacoes' },
    { label: 'Categorias', icon: Tag, path: '/dashboard/categorias' },
    { label: 'Educação', icon: BookOpenCheck, path: '/dashboard/educacao' },
    { label: 'Perfil', icon: User, path: '/dashboard/perfil' },
  ]

  const isPathActive = (itemPath: string) => {
    if (itemPath === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/controles')
    }
    if (itemPath.includes('/dashboard/educacao')){
      return true
    }
    return pathname === itemPath
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-4 z-50">
      {navItems.map(({ label, icon: Icon, path }) => {
        const isActive = isPathActive(path)
        return (
          <button
            key={label}
            onClick={() => router.push(path)}
            className={`flex flex-col items-center text-xs ${isActive ? 'text-primary' : 'text-gray-500'}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
