'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SlidersHorizontal,
  Sun,
  Target,
  UsersRound,
} from 'lucide-react'
import { useUserTheme } from '@/providers/UserThemeProvider'

import { useUserSession } from '@/stores/useUserSession'
import { isOrgAdminRole } from '@/utils/roles'

import logoColorida from '../../../../assets/Logo/PNG/Logo Fly principal colorida.png'
import logoBranca from '../../../../assets/Logo/PNG/Logo Fly principal branca.png'
import logoBirdColor from '../../../../assets/Logo/PNG/Logo Fly colorida 1.png'
import logoBirdWhite from '../../../../assets/Logo/PNG/Logo Fly branca 1.png'

type NavItem = {
  id: string
  label: string
  Icon: typeof LayoutDashboard
  path: string
  masterOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, path: '/advisor' },
  { id: 'reports', label: 'Relatórios', Icon: FileText, path: '/advisor/relatorio-cliente' },
  { id: 'planning', label: 'Planejamento', Icon: SlidersHorizontal, path: '/advisor/planejamento' },
  { id: 'goal-controls', label: 'Controle de Metas', Icon: Target, path: '/advisor/controle-metas' },
  { id: 'organization', label: 'Organização', Icon: Building2, path: '/advisor/organization', masterOnly: true },
  { id: 'settings', label: 'Configurações', Icon: Settings, path: '/advisor/configuracoes' },
]

const NAV_ITEMS_ORG: NavItem[] = [
  { id: 'org-dashboard', label: 'Dashboard', Icon: LayoutDashboard, path: '/advisor/organization/dashboard' },
  { id: 'org-advisors', label: 'Gestão de Advisors', Icon: UsersRound, path: '/advisor/organization' },
  { id: 'settings', label: 'Configurações', Icon: Settings, path: '/advisor/configuracoes' },
]

type AdvisorSidebarProps = {
  collapsed: boolean
  onCollapsedChange: (value: boolean) => void
}

export default function AdvisorSidebar({ collapsed, onCollapsedChange }: AdvisorSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, saveTheme } = useUserTheme()
  const session = useUserSession((s) => s.user)
  const logout = useUserSession((s) => s.logout)

  const isDark = theme === 'DARK'
  const userRole = session?.userData?.user?.role ?? ''
  const isMaster = isOrgAdminRole(userRole)

  const visibleItems = isMaster ? NAV_ITEMS_ORG : NAV_ITEMS.filter((item) => !item.masterOnly)

  function isActive(item: NavItem) {
    const [basePath] = item.path.split('?')
    // exact match for /advisor and /advisor/organization/dashboard to avoid false positives
    if (basePath === '/advisor' || basePath === '/advisor/organization/dashboard') {
      return pathname === basePath
    }
    if (basePath === '/advisor/organization') {
      return pathname === basePath || pathname.startsWith(`${basePath}/advisors/`)
    }
    return pathname.startsWith(basePath)
  }

  async function handleLogout() {
    await logout()
    router.push('/advisor/login')
  }

  const logoExpanded = isDark ? logoBranca : logoColorida
  const logoCollapsed = isDark ? logoBirdWhite : logoBirdColor

  return (
    <nav
      aria-label="Navegação Advisor"
      className={[
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-200',
        collapsed ? 'w-[5rem]' : 'w-[17rem]',
      ].join(' ')}
    >
      {/* Logo + collapse button */}
      <div className="flex h-16 items-center justify-between px-4">
        {collapsed ? (
          <div className="flex w-full items-center justify-center">
            <Image
              src={logoCollapsed}
              alt="Fly Advisory"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Image
              src={logoExpanded}
              alt="Fly Advisory"
              width={110}
              height={24}
              className="object-contain"
            />
            <span className="rounded-full border border-[#4F98C2]/40 bg-[#EAF4FA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2F6E91]">
              Advisory
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Advisory label */}
      {!collapsed && (
        <div className="mx-4 mb-2 rounded-xl border border-[#D7EAF5] bg-[#F3FAFF] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2F6E91]">Fly Advisory</p>
          <p className="text-xs text-slate-500">Plataforma profissional</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-1" role="list">
          {visibleItems.map((item) => {
            const active = isActive(item)
            return (
              <li key={item.id}>
                <Link
                  href={item.path}
                  className={[
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    active
                      ? 'bg-[#EAF4FA] text-[#2F6E91]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#2F6E91]',
                    collapsed ? 'justify-center' : '',
                  ].join(' ')}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.Icon className={['h-5 w-5 flex-shrink-0', active ? 'text-[#2F6E91]' : 'text-slate-500'].join(' ')} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Footer: theme toggle + logout */}
      <div className="border-t border-slate-100 px-2 py-3 space-y-1">
        <button
          type="button"
          onClick={() => saveTheme(isDark ? 'LIGHT' : 'DARK').catch(() => {})}
          className={[
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
          aria-label="Alternar tema"
          title={collapsed ? (isDark ? 'Tema claro' : 'Tema escuro') : undefined}
        >
          {isDark ? <Sun className="h-5 w-5 flex-shrink-0" /> : <Moon className="h-5 w-5 flex-shrink-0" />}
          {!collapsed && <span>{isDark ? 'Tema claro' : 'Tema escuro'}</span>}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className={[
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </nav>
  )
}

export const ADVISOR_SIDEBAR_EXPANDED_CLASS = 'lg:pl-[17rem]'
export const ADVISOR_SIDEBAR_COLLAPSED_CLASS = 'lg:pl-[5rem]'
