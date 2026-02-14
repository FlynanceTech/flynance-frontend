'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  BadgeDollarSign,
  LayoutDashboard,
  LogOut,
  Ticket,
  Users,
  UserSquare2,
} from 'lucide-react'
import clsx from 'clsx'
import { useUserSession } from '@/stores/useUserSession'

const items = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Advisors', href: '/admin/advisors', icon: UserSquare2 },
  { label: 'Leads', href: '/admin/leads', icon: Users },
  { label: 'Billing/Coupons', href: '/admin/billing/coupons', icon: Ticket },
  { label: 'Billing/Plans', href: '/admin/billing/plans', icon: BadgeDollarSign },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/admin/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useUserSession()

  const onLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <aside className="h-screen w-72 border-r border-slate-200 bg-white p-5 flex flex-col">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Flynance</p>
        <h1 className="mt-1 text-lg font-semibold text-[#333C4D] flex items-center gap-2">
          <BarChart3 size={18} className="text-[#4F98C2]" />
          Painel Admin
        </h1>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActivePath(pathname ?? '', item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                active
                  ? 'bg-[#EAF4FA] text-[#17557A] font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        <LogOut size={16} />
        Sair
      </button>
    </aside>
  )
}
