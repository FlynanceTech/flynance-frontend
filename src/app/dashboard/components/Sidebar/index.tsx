'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'
import logoFlynance from '../../../../../assets/Logo/PNG/Logo Fly principal colorida.png'
import logoFly from '../../../../../assets/Logo/PNG/Logo Fly colorida 1.png'
import logoFlynanceWhite from '../../../../../assets/Logo/PNG/Logo Fly principal branca.png'
import logoFlyWhite from '../../../../../assets/Logo/PNG/Logo Fly branca 1.png'
import {
  Landmark,
  LayoutDashboard,
  LogOut,
  Moon,
  Tag,
  Sun,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpenCheck,
  ClipboardList,
  BarChart3,
  Clock3,
  House,
  ShieldCheck,
  Users,
} from 'lucide-react'
import SidebarItem from './SidebarItem'
import { useUserSession } from '@/stores/useUserSession'
import clsx from 'clsx'
import { canAccessAdvisorRole, isAdminRole } from '@/utils/roles'
import { useTranslations } from 'next-intl'
import { useUserTheme } from '@/providers/UserThemeProvider'

type NavItem = {
  id: string
  label: string
  icon: ReactNode
  path: string
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tPreferences = useTranslations('preferences')
  const { logout, user } = useUserSession()
  const { theme, saveTheme, isSavingTheme } = useUserTheme()
  const role = user?.userData?.user?.role
  const isAdmin = isAdminRole(role)
  const isAdvisor = canAccessAdvisorRole(role)

  const [collapsed, setCollapsed] = useState(false)
  const isDarkTheme = theme === 'DARK'

  const navItems: NavItem[] = [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard />, path: '/dashboard' },
    { id: 'transactions', label: t('transactions'), icon: <Landmark />, path: '/dashboard/transacoes' },
    { id: 'accounts', label: t('accounts'), icon: <ClipboardList />, path: '/dashboard/contas-fixas' },
    { id: 'future', label: t('future'), icon: <Clock3 />, path: '/dashboard/futuros' },
    { id: 'reports', label: t('reports'), icon: <BarChart3 />, path: '/dashboard/relatorios' },
    { id: 'categories', label: t('categories'), icon: <Tag />, path: '/dashboard/categorias' },
    { id: 'education', label: t('education'), icon: <BookOpenCheck />, path: '/dashboard/educacao' },
    { id: 'coupleAccount', label: t('coupleAccount'), icon: <House />, path: '/dashboard/conta-casal' },
    ...(isAdvisor
      ? [{ id: 'clients', label: t('clients'), icon: <Users />, path: '/advisor' }]
      : []),
    { id: 'profile', label: t('profile'), icon: <User />, path: '/dashboard/perfil' },
    ...(isAdmin
      ? [{ id: 'admin', label: t('admin'), icon: <ShieldCheck />, path: '/admin/dashboard' }]
      : []),
  ]

  const normalize = (p: string) => p.replace(/\/+$/, '')
  const current = normalize(pathname ?? '')

  const isPathActive = (itemPath: string) => {
    const base = normalize(itemPath)

    if (base === '/dashboard') {
      return current === '/dashboard' || current.startsWith('/dashboard/controles')
    }

    return current === base || current.startsWith(`${base}/`)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleThemeToggle = async () => {
    if (isSavingTheme) return
    try {
      await saveTheme(isDarkTheme ? 'LIGHT' : 'DARK')
    } catch {
      // feedback ja tratado na camada de preferencia
    }
  }

  return (
    <aside
      className={
        'h-full bg-white py-6 px-4 rounded-2xl border border-[#E2E8F0] flex flex-col justify-start items-center transition-all duration-300 ' +
        (collapsed ? 'w-20 items-center' : 'min-w-44')
      }
    >
      <div className="relative">
        <button
          className={clsx(
            'absolute text-gray-400 bg-white p-2 rounded-full shadow-md border border-gray-200',
            collapsed ? '-right-16' : '-right-[110px]'
          )}
          onClick={() => setCollapsed((prev) => !prev)}
          title={t('toggleMenu')}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        {!collapsed ? (
          <Image
            src={isDarkTheme ? logoFlynanceWhite : logoFlynance}
            className="w-[120px] lg:w-[150px]"
            alt="Flynance Logo"
            width={120}
            height={60}
          />
        ) : (
          <Image
            src={isDarkTheme ? logoFlyWhite : logoFly}
            className="w-[120px] lg:w-[150px]"
            alt="Flynance Logo"
            width={100}
            height={40}
          />
        )}
      </div>

      <nav className="flex h-full w-full flex-col justify-between gap-6">
        <ul className="flex flex-col gap-6">
          {navItems.map(({ id, label, icon, path }) => (
            <SidebarItem
              key={id}
              label={label}
              icon={icon}
              collapsed={collapsed}
              active={isPathActive(path)}
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
            type="button"
            onClick={() => {
              void handleThemeToggle()
            }}
            disabled={isSavingTheme}
            className={clsx(
              'flex items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-[#333C4D] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60',
              collapsed ? 'justify-center gap-0' : 'justify-between gap-3',
              'dark:border-white/10 dark:bg-white/5 dark:text-white'
            )}
            aria-label={tPreferences('theme.title')}
            title={tPreferences('theme.title')}
          >
            <div className="flex items-center gap-2">
              <Sun size={16} className={clsx(isDarkTheme ? 'text-zinc-500' : 'text-amber-500')} />
              {!collapsed && (
                <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-zinc-700">
                  <span
                    className={clsx(
                      'absolute h-5 w-5 rounded-full shadow transition-transform duration-200',
                      isDarkTheme ? 'translate-x-5 bg-[#F4C542]' : 'translate-x-0.5 bg-[#111827]'
                    )}
                  />
                </span>
              )}
              <Moon size={16} className={clsx(isDarkTheme ? 'text-[#F4C542]' : 'text-slate-400')} />
            </div>
            {!collapsed && (
              <span className="text-xs font-semibold">
                {isDarkTheme ? tPreferences('theme.dark') : tPreferences('theme.light')}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={clsx(
              'flex items-center gap-2 cursor-pointer',
              collapsed
                ? 'text-[#333C4D] hover:text-red-400 dark:text-white'
                : 'border-t border-gray-200 pt-3 text-[#333C4D] hover:text-red-400 dark:border-white/10 dark:text-white'
            )}
          >
            <LogOut size={18} />
            {!collapsed && t('logout')}
          </button>
        </footer>
      </nav>
    </aside>
  )
}
