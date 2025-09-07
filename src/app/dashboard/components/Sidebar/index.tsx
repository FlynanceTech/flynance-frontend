// Atualização para Sidebar retrátil estilo "collapsed" com toggle
'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import logoFlynance from '../../../../../assets/logo-flynance.png'
import logoFly from '../../../../../public/icons/logo-192x192.png'
import {
  BookOpenCheck,
  Landmark,
  LayoutDashboard,
  LogOut,
  Tag,
  User,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import SidebarItem from './SidebarItem'
import { useUserSession } from '@/stores/useUserSession'
import clsx from 'clsx'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useUserSession()

  const [collapsed, setCollapsed] = useState(false)

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
    <aside
      className={
        'bg-white py-6 px-4 rounded-2xl border border-[#E2E8F0] flex flex-col justify-center items-center  transition-all duration-300 ' +
        (collapsed ? 'w-20 items-center' : 'min-w-44')
      }
    >
       <div className='relative'>
        <button
            className={clsx("absolute  text-gray-400 bg-white p-2 rounded-full shadow-md border border-gray-200",
              collapsed ?  "-right-16" : "-right-[110px]"
            )}
            onClick={() => setCollapsed((prev) => !prev)}
            title="Expandir/retrair menu"
          >
            {
              collapsed ? 
              <PanelLeftOpen  size={20} />:
              <PanelLeftClose size={20} />
            }
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        {!collapsed ? 
          <Image
            src={logoFlynance}
            className="w-[120px] lg:w-[150px]"
            alt="Flynance Logo"
            width={120}
            height={60}
          /> : 
          <Image
            src={logoFly}
            className="w-[120px] lg:w-[150px]"
            alt="Flynance Logo"
            width={100}
            height={40}
          /> 
          
        }

      </div>
     

      <nav className="flex flex-col justify-between h-full">
        <ul className="flex flex-col gap-6">
          {navItems.map(({ label, icon, path }) => (
            <SidebarItem
              key={label}
              label={label}
              icon={icon}
              collapsed={collapsed}
              active={pathname === path}
              onClick={() => router.push(path)}
            />
          ))}
        </ul>

        <footer
          className={
            'pt-4 border-t border-gray-300 flex ' +
            (collapsed ? 'justify-center' : 'px-2 flex-col gap-4')
          }
        >
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#333C4D] hover:text-red-500 cursor-pointer"
          >
            <LogOut size={18} />
            {!collapsed && 'Sair'}
          </button>
        </footer>
      </nav>
    </aside>
  )
}
