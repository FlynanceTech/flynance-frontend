'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { UserThemeProvider } from '@/providers/UserThemeProvider'
import AdvisorSidebar, {
  ADVISOR_SIDEBAR_COLLAPSED_CLASS,
  ADVISOR_SIDEBAR_EXPANDED_CLASS,
} from './components/AdvisorSidebar'
import AdvisorActingPill from '../dashboard/components/AdvisorActingPill'
import { FileText, LayoutDashboard, Settings } from 'lucide-react'

const NO_SIDEBAR_PATHS = [
  '/advisor/login',
  '/advisor/cadastro',
  '/advisor/onboarding',
  '/advisor/client-invite',
  '/advisor/invite',
]

function shouldShowSidebar(pathname: string) {
  return !NO_SIDEBAR_PATHS.some((p) => pathname.startsWith(p))
}

function AdvisorLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const showSidebar = shouldShowSidebar(pathname)

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F5F7FA] text-[hsl(var(--foreground))] transition-colors">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <AdvisorSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </aside>

      {/* Scrollable content area */}
      <main
        className={[
          'h-screen overflow-y-auto overflow-x-hidden',
          sidebarCollapsed ? ADVISOR_SIDEBAR_COLLAPSED_CLASS : ADVISOR_SIDEBAR_EXPANDED_CLASS,
        ].join(' ')}
      >
        {!pathname.startsWith('/advisor/relatorio-cliente') && <AdvisorActingPill />}
        {children}
      </main>

      {/* Mobile advisor bottom nav */}
      <AdvisorMobileNav pathname={pathname} />
    </div>
  )
}

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserThemeProvider>
        <AdvisorLayoutInner>{children}</AdvisorLayoutInner>
      </UserThemeProvider>
    </ThemeProvider>
  )
}

/* ── Mobile bottom nav (advisor-specific) ── */

const MOBILE_NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, path: '/advisor' },
  { id: 'reports', label: 'Relatórios', Icon: FileText, path: '/advisor/relatorio-cliente' },
  { id: 'settings', label: 'Config.', Icon: Settings, path: '/advisor/configuracoes' },
]

function AdvisorMobileNav({ pathname }: { pathname: string }) {
  const router = useRouter()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-slate-200 bg-white py-3">
      {MOBILE_NAV.map(({ id, label, Icon, path }) => {
        const basePath = path.split('?')[0]
        const active = basePath === '/advisor' ? pathname === '/advisor' : pathname.startsWith(basePath)
        return (
          <button
            key={id}
            type="button"
            onClick={() => router.push(path)}
            className={['flex flex-col items-center gap-0.5 text-[11px] font-medium', active ? 'text-[#2F6E91]' : 'text-slate-500'].join(' ')}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
