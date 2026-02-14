'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

const mobileItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Advisors', href: '/admin/advisors' },
  { label: 'Leads', href: '/admin/leads' },
  { label: 'Coupons', href: '/admin/billing/coupons' },
  { label: 'Plans', href: '/admin/billing/plans' },
]

function getTitle(pathname: string): string {
  if (pathname.startsWith('/admin/advisors')) return 'Advisors'
  if (pathname.startsWith('/admin/leads')) return 'Leads'
  if (pathname.startsWith('/admin/billing/coupons')) return 'Billing / Coupons'
  if (pathname.startsWith('/admin/billing/plans')) return 'Billing / Plans'
  return 'Dashboard'
}

export default function AdminTopbar() {
  const pathname = usePathname()

  const title = useMemo(() => getTitle(pathname ?? ''), [pathname])

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="px-4 py-4 md:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Area administrativa</p>
        <h2 className="mt-1 text-xl font-semibold text-[#333C4D]">{title}</h2>
      </div>

      <div className="md:hidden border-t border-slate-100 px-3 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mobileItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium',
                  active ? 'bg-[#EAF4FA] text-[#17557A]' : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
