'use client'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'
import logo from '../../../../../assets/logo-flynance.png'
import { BookOpenCheck, Landmark, LayoutDashboard, LogOut, Tag, User } from 'lucide-react'
import SidebarItem from './SidebarItem'
import { useUserSession } from '@/stores/useUserSession'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const {logout} = useUserSession()

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard />, path: '/dashboard' },
    { label: 'Transações', icon: <Landmark />, path: '/dashboard/transacoes' },
    { label: 'Categorias', icon: <Tag />, path: '/dashboard/categorias' },
    { label: 'Educação', icon: <BookOpenCheck />, path: '/dashboard/educacao' },
    { label: 'Perfil', icon: <User />, path: '/dashboard/perfil' },
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <aside className='bg-white py-8 rounded-2xl border border-[#E2E8F0] flex flex-col gap-8 min-w-64'>
      <div className='px-8'>
        <Image
          src={logo}
          className="w-[120px] lg:w-[150px]"
          alt="Flynance Logo"
          width={150}
          height={80}
        />
      </div>
      <nav className='flex flex-col justify-between h-full'>
        <ul className='flex flex-col gap-8'>
          {navItems.map(({ label, icon, path }) => (
            <SidebarItem
              key={label}
              label={label}
              icon={icon}
              active={pathname === path}
              onClick={() => router.push(path)}
            />
          ))}
        </ul>
        <footer className='px-8 pt-8 border-t border-gray-300 flex flex-col gap-4'>
          <button onClick={handleLogout} className='flex gap-2 text-[#333C4D] cursor-pointer'> <LogOut /> Sair</button>
        </footer>
      </nav>
    </aside>
  )
}
